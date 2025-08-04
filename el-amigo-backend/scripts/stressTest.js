// Simulador de carga: crea 1000 posts en el feed
const axios = require('axios');
const main = async () => {
  for(let i=0; i<1000; i++) {
    await axios.post("http://localhost:3000/api/social/post", {
      userId: "1", content: "Test post "+i
    });
  }
  console.log("Stress test completado");
};
main();
