/// <reference types="jest" />

declare global {
  var __TEST_ROUTER__: {
    push: jest.Mock;
    replace: jest.Mock;
    back: jest.Mock;
  };
}

export {};
