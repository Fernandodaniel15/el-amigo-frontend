class JoinCourse {
  constructor(courseRepo) {
    this.courseRepo = courseRepo;
  }
  async execute({ courseId, userId }) {
    return await this.courseRepo.join(courseId, userId);
  }
}
module.exports = JoinCourse;
