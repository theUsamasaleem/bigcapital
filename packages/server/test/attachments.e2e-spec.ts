import * as request from 'supertest';
import { app, AuthorizationHeader, orgainzationId } from './init-app-test';

describe('Attachments (e2e)', () => {
  it('/attachments/:id/presigned-url (GET)', () => {
    return request(app.getHttpServer())
      .get('/attachments/test-id/presigned-url')
      .set('organization-id', orgainzationId)
      .set('Authorization', AuthorizationHeader)
      .expect(200);
  });

  it('/attachments/:id/versions (GET) is gated by the versioning feature', () => {
    // The document-versioning feature is off by default, so the endpoint must
    // be reachable (route wired) yet forbidden until the feature is enabled.
    return request(app.getHttpServer())
      .get('/attachments/test-id/versions')
      .set('organization-id', orgainzationId)
      .set('Authorization', AuthorizationHeader)
      .expect(403);
  });
});
