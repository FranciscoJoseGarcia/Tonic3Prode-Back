module.exports = {
  validateRequiredEnvs: (requiredEnvs) => {
    for (const requiredEnv of requiredEnvs) {
      if (!process.env[requiredEnv])
        throw new Error(`${requiredEnv} must be defined on the .env file`);
    }
  },
  date: (schema) => {
    schema
      .virtual("date")
      .set(function (property, date) {
        this[property] = new Date(date);
      })
      .get(function (property) {
        return this[property].toISOString().substring(0, 10);
      });
  },
  validationUser: (user, res) => {
    if (!user) return res.status(404).send("User not found");

    if (user.rol !== "superAdmin" && user.rol !== "admin") {
      return res.status(403).send("You are not allowed to do this action");
    }
  },
  gameDate: (schema) => {
    schema.virtual("date").get(function () {
      const date = new Date();
      date.setDate(this.dayOfTheMonth);
      date.setMonth(this.month - 1);
      // convert hours and minutes.
      const hour = (this.hour = Math.floor(hour / 1000));
      const minute = (hour % 1000) / 10;
      date.setHours(hour);
      date.setMinutes(minute);

      return date.toISOString().substring(0, 10);
    });
  },
  fullname: (schema) => {
    schema.virtual("fullName").get(function () {
      return `${this.name} ${this.lastName}`;
    });
  }
};


