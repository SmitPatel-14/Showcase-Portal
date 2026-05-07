import swaggerJsdoc from "swagger-jsdoc";

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "CLG Portal API",
      version: "1.0.0",
      description: "API documentation for College Portal application",
      contact: {
        name: "API Support",
      },
    },
    servers: [
      {
        url: "http://localhost:3000",
        description: "Development Server",
      },
      {
        url: "https://your-production-url.com",
        description: "Production Server",
      },
    ],
  },
  apis: ["./src/routes/*.route.js"],
};

const swaggerSpec = swaggerJsdoc(options);

export default swaggerSpec;
