import request from 'supertest';
import { createApp } from '../app';
import { swaggerSpec } from '../config/swagger';

describe('Swagger Documentation Endpoints', () => {
  const app = createApp();

  it('GET /docs.json harus mengembalikan JSON OpenAPI specification', async () => {
    const res = await request(app).get('/docs.json');
    expect(res.status).toBe(200);
    expect(res.body.openapi).toBe('3.0.0');
    expect(res.body.info.title).toBe(swaggerSpec.info.title);
    expect(res.body.paths).toBeDefined();
  });

  it('GET /swagger.json harus mengembalikan JSON OpenAPI specification', async () => {
    const res = await request(app).get('/swagger.json');
    expect(res.status).toBe(200);
    expect(res.body.openapi).toBe('3.0.0');
  });

  it('GET /api/v1/docs.json harus mengembalikan JSON OpenAPI specification', async () => {
    const res = await request(app).get('/api/v1/docs.json');
    expect(res.status).toBe(200);
    expect(res.body.openapi).toBe('3.0.0');
  });

  it('GET /docs/ harus melayani HTML Swagger UI', async () => {
    const res = await request(app).get('/docs/');
    expect(res.status).toBe(200);
    expect(res.text).toContain('swagger-ui');
  });

  it('GET /api-docs/ harus melayani HTML Swagger UI', async () => {
    const res = await request(app).get('/api-docs/');
    expect(res.status).toBe(200);
    expect(res.text).toContain('swagger-ui');
  });

  it('GET /api/v1/docs/ harus melayani HTML Swagger UI', async () => {
    const res = await request(app).get('/api/v1/docs/');
    expect(res.status).toBe(200);
    expect(res.text).toContain('swagger-ui');
  });
});
