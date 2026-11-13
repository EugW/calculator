/**
 * Pan and zoom of the damage graph canvas. The view is a transform of the
 * viewport element (translate, then scale from its top left corner), written
 * to its style directly: panning does not render React.
 *
 * Dragging pans (from anywhere but a button); the wheel zooms at the
 * pointer, and so does a trackpad pinch (a wheel with ctrlKey; gesture
 * events in Safari); two touches pinch.
 */
const MIN_ZOOM = 0.1;
const MAX_ZOOM = 2;
/** Pointer travel (px) after which a press pans instead of clicking. */
const CLICK_DISTANCE = 3;
const IS_MAC = typeof navigator != 'undefined' && /Mac/.test(navigator.userAgent);

export class Viewport {
    constructor() {
        this.x = 0;
        this.y = 0;
        this.k = 1;
        this.canvas = null;
        this.element = null;
        this.dragged = false;
    }

    /**
     * @param {HTMLElement} canvas where pointers pan and zoom
     * @param {HTMLElement} element the viewport it transforms
     * @returns {Function} detaches the listeners
     */
    attach(canvas, element) {
        this.canvas = canvas;
        this.element = element;
        this.apply();

        let pointers = new Map();
        let press = null;
        let gesture = null;
        let local = (event) => {
            let rect = canvas.getBoundingClientRect();
            return {x: event.clientX - rect.left, y: event.clientY - rect.top};
        };
        // A press starts from the current view: one pointer pans from where it went down.
        let startPress = () => {
            let [point] = pointers.values();
            press = {start: point, x: this.x, y: this.y, moved: press?.moved || false};
        };
        let pinchOf = () => {
            let [a, b] = pointers.values();
            return {distance: Math.hypot(a.x - b.x, a.y - b.y) || 1, x: (a.x + b.x) / 2, y: (a.y + b.y) / 2};
        };
        let pinch = null;

        let onWheel = (event) => {
            event.preventDefault();
            let delta = -event.deltaY * (event.deltaMode == 1 ? 0.05 : event.deltaMode ? 1 : 0.002);
            this.zoomAt(local(event), Math.pow(2, delta * (event.ctrlKey && IS_MAC ? 10 : 1)));
        };

        let onMove = (event) => {
            if (!pointers.has(event.pointerId)) return;
            pointers.set(event.pointerId, local(event));
            if (pointers.size >= 2) {
                let next = pinchOf();
                let k = clamp(this.k * next.distance / pinch.distance, MIN_ZOOM, MAX_ZOOM);
                this.set({
                    x: next.x - (pinch.x - this.x) * k / this.k,
                    y: next.y - (pinch.y - this.y) * k / this.k,
                    k,
                });
                pinch = next;
                press.moved = true;
                return;
            }
            let point = pointers.get(event.pointerId);
            let dx = point.x - press.start.x, dy = point.y - press.start.y;
            if (!press.moved && Math.hypot(dx, dy) < CLICK_DISTANCE) return;
            if (!press.moved) {
                press.moved = true;
                canvas.classList.add('panning');
            }
            this.set({x: press.x + dx, y: press.y + dy, k: this.k});
        };

        let onUp = (event) => {
            if (!pointers.delete(event.pointerId)) return;
            if (pointers.size >= 2) {
                pinch = pinchOf();
            } else if (pointers.size == 1) {
                startPress();
            } else {
                // The click that follows a pan selects nothing (takeDrag).
                this.dragged = press.moved;
                if (this.dragged) setTimeout(() => this.dragged = false);
                press = null;
                canvas.classList.remove('panning');
                window.removeEventListener('pointermove', onMove);
                window.removeEventListener('pointerup', onUp);
                window.removeEventListener('pointercancel', onUp);
            }
        };

        let onDown = (event) => {
            if (event.pointerType == 'mouse' && event.button != 0) return;
            if (event.target.closest('button')) return;
            if (!pointers.size) {
                window.addEventListener('pointermove', onMove);
                window.addEventListener('pointerup', onUp);
                window.addEventListener('pointercancel', onUp);
            }
            pointers.set(event.pointerId, local(event));
            if (pointers.size == 1) {
                press = null;
                startPress();
            } else if (pointers.size == 2) {
                pinch = pinchOf();
            }
        };

        // Safari: a trackpad pinch; touches pinch with pointers.
        let onGestureStart = (event) => {
            event.preventDefault();
            gesture = event.scale;
        };
        let onGestureChange = (event) => {
            event.preventDefault();
            if (pointers.size >= 2 || !gesture) return;
            this.zoomAt(local(event), event.scale / gesture);
            gesture = event.scale;
        };

        canvas.addEventListener('wheel', onWheel, {passive: false});
        canvas.addEventListener('pointerdown', onDown);
        canvas.addEventListener('gesturestart', onGestureStart);
        canvas.addEventListener('gesturechange', onGestureChange);
        return () => {
            canvas.removeEventListener('wheel', onWheel);
            canvas.removeEventListener('pointerdown', onDown);
            canvas.removeEventListener('gesturestart', onGestureStart);
            canvas.removeEventListener('gesturechange', onGestureChange);
            window.removeEventListener('pointermove', onMove);
            window.removeEventListener('pointerup', onUp);
            window.removeEventListener('pointercancel', onUp);
            this.canvas = null;
            this.element = null;
        };
    }

    apply() {
        if (this.element) this.element.style.transform = `translate(${this.x}px, ${this.y}px) scale(${this.k})`;
    }

    set({x, y, k}) {
        this.x = x;
        this.y = y;
        this.k = k;
        this.apply();
    }

    /**
     * @param {{x: number, y: number}} point in the canvas; it stays where it is
     * @param {number} factor
     */
    zoomAt(point, factor) {
        let k = clamp(this.k * factor, MIN_ZOOM, MAX_ZOOM);
        this.set({
            x: point.x - (point.x - this.x) * k / this.k,
            y: point.y - (point.y - this.y) * k / this.k,
            k,
        });
    }

    /**
     * @param {number} factor zoom at the canvas center
     */
    zoomBy(factor) {
        if (!this.canvas) return;
        this.zoomAt({x: this.canvas.clientWidth / 2, y: this.canvas.clientHeight / 2}, factor);
    }

    /**
     * Centers the bounds, as large as they fit with `padding` (a fraction of
     * their size), at most at `maxZoom`.
     *
     * @param {{x: number, y: number, width: number, height: number}} bounds
     * @param {{padding: number, maxZoom: number}} options
     */
    fit(bounds, {padding = 0.04, maxZoom = 1} = {}) {
        if (!this.canvas || !bounds) return;
        let width = this.canvas.clientWidth, height = this.canvas.clientHeight;
        if (!width || !height || !bounds.width || !bounds.height) return;
        let k = clamp(Math.min(width / (bounds.width * (1 + padding)), height / (bounds.height * (1 + padding))), MIN_ZOOM, Math.min(maxZoom, MAX_ZOOM));
        this.set({
            x: width / 2 - (bounds.x + bounds.width / 2) * k,
            y: height / 2 - (bounds.y + bounds.height / 2) * k,
            k,
        });
    }

    /**
     * @returns {boolean} whether the click being handled ends a pan (once)
     */
    takeDrag() {
        let dragged = this.dragged;
        this.dragged = false;
        return dragged;
    }
}

function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
}
