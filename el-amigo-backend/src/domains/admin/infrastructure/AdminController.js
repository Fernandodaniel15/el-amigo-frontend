const WriteLog = require('../application/WriteLog');
const GetLogs = require('../application/GetLogs');
const LogRepository = require('./LogRepository');
const logRepo = new LogRepository();
const writeLog = new WriteLog(logRepo);
const getLogs = new GetLogs(logRepo);

exports.write = async (req, res) => {
  try {
    const log = await writeLog.execute(req.body);
    res.status(201).json({ log });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.logs = async (req, res) => {
  try {
    const logs = await getLogs.execute({ modulo: req.query.modulo });
    res.json({ logs });
  } catch (err) {
    res.status(404).json({ error: "No encontrado" });
  }
};
