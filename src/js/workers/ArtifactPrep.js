import { createArtifactCandidateHandler } from '../classes/ArtifactActionPrep';

importScripts('db.js?' + __VERSION__);

self.onmessage = createArtifactCandidateHandler((message, transfer = []) => self.postMessage(message, transfer));
