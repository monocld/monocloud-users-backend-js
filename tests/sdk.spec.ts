/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable import/no-extraneous-dependencies */
import nock from 'nock';
import {
  ExternalAuthenticators,
  ExternalAuthenticatorDisconnectRequest,
  MonoCloudErrorCodeValidationException,
  MonoCloudKeyValidationException,
  MonoCloudServerException,
  MonoCloudBadRequestException,
  MonoCloudUsersBackendClient,
} from '../src';

describe('MonoCloud Users Backed SDK Tests', () => {
  let client: MonoCloudUsersBackendClient;
  let nockInst: nock.Scope;

  beforeEach(() => {
    client = MonoCloudUsersBackendClient.init({
      domain: 'example.com',
      apiKey: 'someKey',
    });
    nockInst = nock('https://example.com');
  });

  afterEach(() => {
    nock.cleanAll();
  });

  test('Create should only send set fields', async () => {
    nockInst.post('/api/users', { name: 'user' }).reply(201, {});

    await client.createUser({ name: 'user' });

    nockInst.done();
  });

  test('Create should send correct enum', async () => {
    nockInst
      .post('/api/users/user/external_authenticator/disconnect', {
        authenticator: 'apple',
      })
      .reply(200, {});

    await client.externalAuthenticatorDisconnectEndpoint('user', {
      authenticator: ExternalAuthenticators.Apple,
    } as ExternalAuthenticatorDisconnectRequest);

    nockInst.done();
  });

  test('Patch should only send set fields', async () => {
    nockInst
      .patch('/api/users/1234/private_data', {
        private_data: {
          hello: 'world',
        },
      })
      .reply(200, {});

    await client.patchPrivateData('1234', {
      private_data: {
        hello: 'world',
      },
    });

    nockInst.done();
  });

  test('Patch should send null fields when set', async () => {
    nockInst
      .patch('/api/users/1234/private_data', {
        private_data: {
          Test: null,
        },
      })
      .reply(200, {});

    await client.patchPrivateData('1234', {
      private_data: {
        Test: null,
      },
    });

    nockInst.done();
  });

  test('Get should receive correct nullable datetime', async () => {
    nockInst.get('/api/users/1234').reply(200, { last_updated: null });

    const result = await client.findUserById('1234');

    expect(result.result.last_updated).toBeNull();
  });

  test('Get with paging should receive correct result', async () => {
    nockInst.get('/api/users').reply(200, [{}, {}], {
      'x-Pagination':
        '{"total_count":20,"page_size":2,"current_page":3,"has_next":true,"has_previous":true}',
    });

    const result = await client.getAllUsers();

    expect(result.result.length).toBe(2);
    expect(result.pageData.total_count).toBe(20);
    expect(result.pageData.page_size).toBe(2);
    expect(result.pageData.current_page).toBe(3);
    expect(result.pageData.has_next).toBe(true);
    expect(result.pageData.has_previous).toBe(true);
  });

  test('Get with paging should handle no pagination header', async () => {
    nockInst.get('/api/users').reply(200, [{}, {}]);

    const result = await client.getAllUsers();

    expect(result.result.length).toBe(2);
    expect(result.pageData.total_count).toBe(0);
    expect(result.pageData.page_size).toBe(0);
    expect(result.pageData.current_page).toBe(0);
    expect(result.pageData.has_next).toBe(false);
    expect(result.pageData.has_previous).toBe(false);
  });

  test('Identity error should handle correctly', async () => {
    nockInst.post('/api/users').reply(
      422,
      {
        type: 'https://httpstatuses.io/422#identity-validation-error',
        title: 'Unprocessable Entity',
        status: 422,
        errors: [
          {
            code: 'PasswordTooShort',
            description: 'Passwords must be at least 8 characters.',
          },
          {
            code: 'PasswordRequiresNonAlphanumeric',
            description:
              'Passwords must have at least one non alphanumeric character.',
          },
          {
            code: 'PasswordRequiresUpper',
            description:
              "Passwords must have at least one uppercase ('A'-'Z').",
          },
        ],
        traceId: '00-cd3f24e893675e2dae242875e99e7c85-296286fe1c04c085-01',
      },
      { 'Content-Type': 'application/problem+json' }
    );

    try {
      await client.createUser({});
      throw new Error('Invalid');
    } catch (error: unknown) {
      expect(error).toBeInstanceOf(MonoCloudErrorCodeValidationException);
      const err = error as MonoCloudErrorCodeValidationException;
      expect(err.message).toContain('Unprocessable Entity');
      expect(err.errors.length).toBe(3);
      expect(err.errors[0].code).toBe('PasswordTooShort');
      expect(err.errors[1].code).toBe('PasswordRequiresNonAlphanumeric');
      expect(err.errors[2].code).toBe('PasswordRequiresUpper');
      expect(err.response).not.toBeFalsy();
      expect(err.response!.type).toBe(
        'https://httpstatuses.io/422#identity-validation-error'
      );
      expect(err.response!.title).toBe('Unprocessable Entity');
      expect(err.response!.status).toBe(422);
      expect(err.response!.traceId).toBe(
        '00-cd3f24e893675e2dae242875e99e7c85-296286fe1c04c085-01'
      );
    }
  });

  test('Key validation error should handle correctly', async () => {
    nockInst.post('/api/users').reply(
      422,
      {
        type: 'https://httpstatuses.io/422#validation-error',
        title: 'Unprocessable Entity',
        status: 422,
        errors: {
          name: ['Invalid Name'],
          password: ['Invalid Password'],
        },
        traceId: '00-cd3f24e893675e2dae242875e99e7c85-296286fe1c04c085-01',
      },
      { 'Content-Type': 'application/problem+json' }
    );

    try {
      await client.createUser({});
      throw new Error('Invalid');
    } catch (error: unknown) {
      expect(error).toBeInstanceOf(MonoCloudKeyValidationException);
      const err = error as MonoCloudKeyValidationException;
      expect(err.message).toContain('Unprocessable Entity');
      expect(Object.keys(err.errors).length).toBe(2);
      expect(err.errors.name?.[0]).toBe('Invalid Name');
      expect(err.errors.password?.[0]).toBe('Invalid Password');
      expect(err.response).not.toBeFalsy();
      expect(err.response!.type).toBe(
        'https://httpstatuses.io/422#validation-error'
      );
      expect(err.response!.title).toBe('Unprocessable Entity');
      expect(err.response!.status).toBe(422);
      expect(err.response!.traceId).toBe(
        '00-cd3f24e893675e2dae242875e99e7c85-296286fe1c04c085-01'
      );
    }
  });

  test('Internal server error should handle correctly', async () => {
    nockInst.post('/api/users').reply(
      500,
      {
        type: 'https://httpstatuses.io/500',
        title: 'Internal Server Error',
        status: 500,
        detail: 'Internal Server Error Detail',
        traceId: '00-b2ceddefca0cf958ed678f144872e3c7-d0b2da5c8fe32598-01',
      },
      { 'Content-Type': 'application/problem+json' }
    );

    try {
      await client.createUser({});
      throw new Error('Invalid');
    } catch (error: unknown) {
      expect(error).toBeInstanceOf(MonoCloudServerException);
      const err = error as MonoCloudServerException;
      expect(err.message).toContain('Internal Server Error');
      expect(err.response).not.toBeFalsy();
      expect(err.response!.type).toBe('https://httpstatuses.io/500');
      expect(err.response!.title).toBe('Internal Server Error');
      expect(err.response!.status).toBe(500);
      expect(err.response!.detail).toBe('Internal Server Error Detail');
      expect(err.response!.traceId).toBe(
        '00-b2ceddefca0cf958ed678f144872e3c7-d0b2da5c8fe32598-01'
      );
    }
  });

  test('Bad request error should handle correctly', async () => {
    nockInst.post('/api/users').reply(
      400,
      {
        type: 'https://httpstatuses.io/400',
        title: 'Bad Request',
        status: 400,
        detail: 'Bad Request Detail',
        traceId: '00-2e0cd141be28223b233dd3907cbe58b4-2ba9f9375b4b78e0-01',
      },
      { 'Content-Type': 'application/problem+json' }
    );

    try {
      await client.createUser({});
      throw new Error('Invalid');
    } catch (error: unknown) {
      expect(error).toBeInstanceOf(MonoCloudBadRequestException);
      const err = error as MonoCloudBadRequestException;
      expect(err.message).toContain('Bad Request');
      expect(err.response).not.toBeFalsy();
      expect(err.response!.type).toBe('https://httpstatuses.io/400');
      expect(err.response!.title).toBe('Bad Request');
      expect(err.response!.status).toBe(400);
      expect(err.response!.detail).toBe('Bad Request Detail');
      expect(err.response!.traceId).toBe(
        '00-2e0cd141be28223b233dd3907cbe58b4-2ba9f9375b4b78e0-01'
      );
    }
  });

  test('No content should handle correctly', async () => {
    nockInst
      .delete('/api/users/1')
      .reply(204, {}, { 'Content-Type': 'application/problem+json' });

    const result = await client.deleteUser('1');

    nockInst.done();

    expect(result.status).toBe(204);
  });

  test('Problem json content type with any suffix should handle correctly', async () => {
    nockInst.post('/api/users').reply(
      422,
      {
        type: 'https://httpstatuses.io/422#validation-error',
        title: 'Unprocessable Entity',
        status: 422,
        errors: {
          name: ['Invalid Name'],
          password: ['Invalid Password'],
        },
        traceId: '00-cd3f24e893675e2dae242875e99e7c85-296286fe1c04c085-01',
      },
      { 'Content-Type': 'application/problem+json#suffix' }
    );

    try {
      await client.createUser({});
      throw new Error('Invalid');
    } catch (error: unknown) {
      expect(error).toBeInstanceOf(MonoCloudKeyValidationException);
      const err = error as MonoCloudKeyValidationException;
      expect(err.message).toContain('Unprocessable Entity');
      expect(Object.keys(err.errors).length).toBe(2);
      expect(err.errors.name?.[0]).toBe('Invalid Name');
      expect(err.errors.password?.[0]).toBe('Invalid Password');
      expect(err.response).not.toBeFalsy();
      expect(err.response!.type).toBe(
        'https://httpstatuses.io/422#validation-error'
      );
      expect(err.response!.title).toBe('Unprocessable Entity');
      expect(err.response!.status).toBe(422);
      expect(err.response!.traceId).toBe(
        '00-cd3f24e893675e2dae242875e99e7c85-296286fe1c04c085-01'
      );
    }
  });

  test('Should return proper response instance on success', async () => {
    nockInst.get('/api/users').reply(200, [{}, {}, {}], {
      header1: 'value1',
      header2: 'value2',
    });

    const result = await client.getAllUsers();

    expect(result.status).toBe(200);
    expect(result.result.length).toBe(3);
    expect(Object.keys(result.headers).length).toBeGreaterThan(2);
    expect(result.headers.header1).toBe('value1');
    expect(result.headers.header2).toBe('value2');
  });
});
