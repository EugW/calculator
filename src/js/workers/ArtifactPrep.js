// The database joins this worker's module graph; see webpack.config.js.
import "../db";
import { createArtifactCandidateHandler } from '../classes/ArtifactActionPrep';

self.onmessage = createArtifactCandidateHandler((message, transfer = []) => self.postMessage(message, transfer));
