// The page is one module graph: the database and the UI are imported here
// rather than built as separate entries, so every module has one instance.
import "./db";
import "./ui";
import { App } from "./classes/App.js"

document.addEventListener("DOMContentLoaded", function() {
    let app = new App(__VERSION__);

    UI.Layout.init(app);
    UI.Layout.refresh();
    app.checkHash();
    app.refresh();
    app.initSync();
});
