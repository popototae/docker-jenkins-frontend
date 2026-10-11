import nextJest from "next/jest.js";

const createJestConfig = nextJest({
  dir: "./",
});

/** @type {import('jest').Config} */
const config = {
  coverageProvider: "v8",
  testEnvironment: "jsdom",
  setupFilesAfterEnv: ["<rootDir>/jest.setup.js"],
  modulePathIgnorePatterns: ["<rootDir>/.next/"],
  testMatch: ["<rootDir>/__tests__/**/*.test.js"],
};

export default createJestConfig(config);
