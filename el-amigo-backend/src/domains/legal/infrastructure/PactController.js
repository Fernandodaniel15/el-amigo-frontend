const SignPact = require('../application/SignPact');
const AuditConsent = require('../application/AuditConsent');
const PactRepository = require('./PactRepository');
const pactRepo = new PactRepository();
const signPact = new SignPact(pactRepo);
const auditConsent = new AuditConsent(pactRepo);

exports.sign = async (req, res) => {
  try {
    const pact = await signPact.execute(req.body);
    res.status(201).json({ pact });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.audit = async (req, res) => {
  try {
    const pact = await auditConsent.execute({ pactId: req.params.pactId });
    res.json({ pact });
  } catch (err) {
    res.status(404).json({ error: "No encontrado" });
  }
};
