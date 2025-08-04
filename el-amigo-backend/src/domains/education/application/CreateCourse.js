class CreateCourse {
  constructor(courseRepo) {
    this.courseRepo = courseRepo;
  }
  async execute(data) {
    return await this.courseRepo.create(data);
  }
}
module.exports = CreateCourse;
