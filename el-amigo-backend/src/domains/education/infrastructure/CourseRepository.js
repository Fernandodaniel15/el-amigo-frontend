const CourseModel = require('./CourseModel');
class CourseRepository {
  async create(data) {
    return await CourseModel.create(data);
  }
  async listAll() {
    return await CourseModel.find();
  }
  async join(courseId, userId) {
    return await CourseModel.findByIdAndUpdate(
      courseId,
      { $addToSet: { alumnos: userId } },
      { new: true }
    );
  }
}
module.exports = CourseRepository;
