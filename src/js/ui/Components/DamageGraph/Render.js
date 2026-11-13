/**
 * The graph as an image: the viewport's content at zoom 1, cropped to the
 * graph's bounds, as a PNG with several device pixels per layout pixel.
 *
 * The browser draws it itself: a copy of the viewport with every style
 * inlined (computed, less what an element would have anyway), with the
 * fonts and images it uses as data URLs, in an SVG foreignObject, drawn to
 * a canvas. The SVG is scaled, not the canvas: text stays sharp.
 */

/** Space around the graph (layout px): a selected node's outline. */
const PAD = 8;
/** Device pixels per layout pixel: at least 2, the screen's when higher. */
const MIN_SCALE = 2;
const MAX_SCALE = 3;
/** Canvas limits that hold in every current desktop browser. */
const MAX_SIDE = 16384;
const MAX_AREA = 64 * 1024 * 1024;
const URL_PATTERN = /url\((['"]?)([^'")]+)\1\)/g;

let sandbox = null;
const defaults = new Map();
const dataUrls = new Map();

/**
 * @param {HTMLElement} viewport the viewport, whatever its pan and zoom
 * @param {{x: number, y: number, width: number, height: number}} bounds what to draw (layout px)
 * @param {{background: string}} options the canvas color under the graph
 * @returns {Promise.<Blob>} a PNG
 */
export async function renderGraph(viewport, bounds, {background}) {
    let width = Math.ceil(bounds.width + 2 * PAD);
    let height = Math.ceil(bounds.height + 2 * PAD);
    let scale = Math.min(
        Math.max(MIN_SCALE, Math.min(MAX_SCALE, window.devicePixelRatio || 1)),
        MAX_SIDE / width,
        MAX_SIDE / height,
        Math.sqrt(MAX_AREA / (width * height)),
    );

    let copy = viewport.cloneNode(true);
    inlineStyles(viewport, copy, null);
    copy.style.transform = `translate(${PAD - bounds.x}px, ${PAD - bounds.y}px)`;
    await embedUrls(copy);

    let root = document.createElement('div');
    root.setAttribute('style', `position: relative; width: ${width}px; height: ${height}px; overflow: hidden;`);
    let fonts = document.createElement('style');
    fonts.textContent = await fontFaces(usedFamilies(viewport));
    root.append(fonts, copy);

    let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width * scale}" height="${height * scale}" viewBox="0 0 ${width} ${height}">`
        + `<foreignObject x="0" y="0" width="${width}" height="${height}">${new XMLSerializer().serializeToString(root)}</foreignObject></svg>`;
    let image = new Image();
    image.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
    await image.decode();

    let canvas = document.createElement('canvas');
    canvas.width = Math.round(width * scale);
    canvas.height = Math.round(height * scale);
    let context = canvas.getContext('2d');
    context.fillStyle = background;
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);

    let blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
    if (!blob) {
        throw new Error(`The graph image (${canvas.width}×${canvas.height}) could not be made`);
    }
    return blob;
}

/**
 * Writes the computed style of `source` and its descendants on their
 * copies. A property is left out when the copy would have it anyway: its
 * value is the element's default and its parent has the same (for inherited
 * properties; others are written the same way, only a little more often).
 *
 * @param {Element} source
 * @param {Element} copy source.cloneNode(true)
 * @param {CSSStyleDeclaration|null} parent the parent's computed style, null for the root
 */
function inlineStyles(source, copy, parent) {
    let style = getComputedStyle(source);
    let base = defaultStyle(source);
    let parts = [];
    for (let index = 0; index < style.length; ++index) {
        let name = style[index];
        if (name.startsWith('--')) continue;
        let value = style.getPropertyValue(name);
        if (value === base[name] && (!parent || parent.getPropertyValue(name) === value)) continue;
        parts.push(name + ': ' + value);
    }
    copy.setAttribute('style', parts.join('; '));

    for (let index = 0; index < source.children.length; ++index) {
        inlineStyles(source.children[index], copy.children[index], style);
    }
}

/**
 * @param {Element} element
 * @returns {Object.<string, string>} the computed style an element of its kind has in an empty page
 */
function defaultStyle(element) {
    let key = element.namespaceURI + ' ' + element.localName;
    if (defaults.has(key)) return defaults.get(key);

    if (!sandbox) {
        let frame = document.createElement('iframe');
        frame.setAttribute('aria-hidden', 'true');
        frame.tabIndex = -1;
        frame.style.cssText = 'position: fixed; left: -10000px; top: 0; width: 100px; height: 100px; visibility: hidden;';
        document.body.appendChild(frame);
        frame.contentDocument.open();
        frame.contentDocument.write('<!DOCTYPE html><html><head></head><body></body></html>');
        frame.contentDocument.close();
        sandbox = frame;
    }
    let doc = sandbox.contentDocument;
    let probe = doc.createElementNS(element.namespaceURI, element.localName);
    doc.body.appendChild(probe);
    let style = sandbox.contentWindow.getComputedStyle(probe);
    let result = {};
    for (let index = 0; index < style.length; ++index) {
        result[style[index]] = style.getPropertyValue(style[index]);
    }
    probe.remove();
    defaults.set(key, result);
    return result;
}

/**
 * Replaces the URLs in the copy's styles (the character icons' sprites) and
 * image sources with data URLs: an SVG drawn as an image loads nothing.
 *
 * @param {HTMLElement} copy
 */
async function embedUrls(copy) {
    let jobs = [];
    for (let element of [copy, ...copy.querySelectorAll('*')]) {
        let style = element.getAttribute('style');
        if (style && style.includes('url(')) {
            jobs.push(replaceUrls(style).then((value) => element.setAttribute('style', value)));
        }
        if (element.localName == 'img' && element.src && !element.src.startsWith('data:')) {
            jobs.push(dataUrl(element.src).then((value) => element.setAttribute('src', value)));
        }
    }
    await Promise.all(jobs);
}

/**
 * @param {string} text CSS
 * @param {string} [base] what relative URLs are relative to
 * @returns {Promise.<string>} the text with data URLs
 */
async function replaceUrls(text, base = document.baseURI) {
    let urls = new Map();
    for (let match of text.matchAll(URL_PATTERN)) {
        let url = match[2];
        if (!url.startsWith('data:') && !urls.has(url)) {
            urls.set(url, dataUrl(new URL(url, base).href));
        }
    }
    for (let [url, promise] of urls) {
        urls.set(url, await promise);
    }
    return text.replace(URL_PATTERN, (match, quote, url) => urls.has(url) ? `url("${urls.get(url)}")` : match);
}

/**
 * @param {string} url
 * @returns {Promise.<string>} the resource as a data URL, loaded once
 */
function dataUrl(url) {
    if (!dataUrls.has(url)) {
        let promise = fetch(url)
            .then((response) => {
                if (!response.ok) throw new Error(`${url}: ${response.status}`);
                return response.blob();
            })
            .then((blob) => new Promise((resolve, reject) => {
                let reader = new FileReader();
                reader.onload = () => resolve(reader.result);
                reader.onerror = () => reject(reader.error);
                reader.readAsDataURL(blob);
            }));
        promise.catch(() => dataUrls.delete(url));
        dataUrls.set(url, promise);
    }
    return dataUrls.get(url);
}

/**
 * @param {HTMLElement} root
 * @returns {Set.<string>} font families the graph's text asks for, in lower case
 */
function usedFamilies(root) {
    let result = new Set();
    for (let element of [root, ...root.querySelectorAll('*')]) {
        for (let family of getComputedStyle(element).fontFamily.split(',')) {
            result.add(unquote(family));
        }
    }
    return result;
}

/**
 * @param {Set.<string>} families
 * @returns {Promise.<string>} the page's @font-face rules for these families, with their fonts as data URLs
 */
async function fontFaces(families) {
    let rules = [];
    for (let sheet of document.styleSheets) {
        let list;
        try {
            list = sheet.cssRules;
        } catch (e) {
            // Another origin's stylesheet: its rules cannot be read.
            continue;
        }
        for (let rule of list) {
            if (rule instanceof CSSFontFaceRule && families.has(unquote(rule.style.getPropertyValue('font-family')))) {
                rules.push(replaceUrls(rule.cssText, sheet.href || document.baseURI));
            }
        }
    }
    return (await Promise.all(rules)).join('\n');
}

function unquote(family) {
    return family.trim().replace(/^(['"])(.*)\1$/, '$2').toLowerCase();
}
