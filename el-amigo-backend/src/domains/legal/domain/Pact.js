class Pact {
  constructor({ id, userA, userB, terms, firmaA, firmaB, fecha, status }) {
    this.id = id;
    this.userA = userA;
    this.userB = userB;
    this.terms = terms;
    this.firmaA = firmaA;
    this.firmaB = firmaB;
    this.fecha = fecha || new Date();
    this.status = status || "pendiente";
  }
}
module.exports = Pact;
