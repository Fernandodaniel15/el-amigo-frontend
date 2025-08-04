const AI = require('../domain/AI');
class TranscribeVoice {
  async execute(audioData) {
    return AI.transcribirAudio(audioData);
  }
}
module.exports = TranscribeVoice;
