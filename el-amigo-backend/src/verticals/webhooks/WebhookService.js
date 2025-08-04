class WebhookService {
  async sendEvent(url, event) {
    // Enviar POST a URL con el event (fetch/axios)
  }
  async registerWebhook({ userId, url, event }) {
    // Guardar registro de webhook
  }
  // ...
}
module.exports = WebhookService;
