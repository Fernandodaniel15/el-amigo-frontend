const CreateCourse = require('../application/CreateCourse');
const JoinCourse = require('../application/JoinCourse');
const CourseRepository = require('./CourseRepository');
const courseRepo = new CourseRepository();
const createCourse = new CreateCourse(courseRepo);
const joinCourse = new JoinCourse(courseRepo);

exports.create = async (req, res) => {
  try {
    const course = await createCourse.execute(req.body);
    res.status(201).json({ course });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.join = async (req, res) => {
  try {
    const course = await joinCourse.execute({ courseId: req.body.courseId, userId: req.body.userId });
    res.json({ course });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.list = async (req, res) => {
  try {
    const courses = await courseRepo.listAll();
    res.json({ courses });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
