import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix("api");
  // CORS: "*" or unset → reflect any origin (origin:true). A comma list → exact allow-list.
  // NOTE: passing ["*"] as an array does NOT work — Express matches it as a literal origin,
  // so the wildcard must stay a boolean/string, never an array.
  const corsOrigin = process.env.CORS_ORIGIN?.trim();
  app.enableCors({
    origin: !corsOrigin || corsOrigin === "*" ? true : corsOrigin.split(",").map((o) => o.trim()),
  });
  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));

  const config = new DocumentBuilder()
    .setTitle("Papaya Claims Platform API")
    .setDescription("Plans · Claims · Calculator · Assessment · Workflow · Analytics")
    .setVersion("1.0")
    .build();
  SwaggerModule.setup("api/docs", app, SwaggerModule.createDocument(app, config));

  const port = Number(process.env.PORT) || 4000;
  await app.listen(port, "0.0.0.0");
  console.log(`API on http://localhost:${port}  ·  docs at /api/docs`);
}
bootstrap();
