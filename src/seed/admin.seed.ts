import mongoose from "mongoose";
import bcrypt from "bcryptjs";

import { env } from "../config/env.js";
import User from "../models/user.model.js";

const createAdmin = async () => {
  await mongoose.connect(env.MONGODB_URI);

  const existingAdmin = await User.findOne({
    role: "ADMIN",
  });

  if (existingAdmin) {
    console.log("Admin already exists");
    process.exit(0);
  }

  const hashedPassword = await bcrypt.hash(
    "Admin@12345",
    10
  );

  await User.create({
    name: "System Admin",
    email: "admin@system.com",
    password: hashedPassword,
    role: "ADMIN",
    isVerified: true,
  });

  console.log("Admin created successfully");
  process.exit(0);
};

createAdmin();