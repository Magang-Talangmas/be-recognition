import { MlRegisterService } from '../services/ml-register.service';
import { env } from '../config/env';

jest.mock('../config/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

const baseEnv = { ...env };

describe('MlRegisterService', () => {
  let service: MlRegisterService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new MlRegisterService();
    Object.assign(env, {
      ...baseEnv,
      ML_REGISTER_ENABLED: true,
      ML_REGISTER_URL: 'http://ml/api/v1/employees/sync-ml',
      ML_REGISTER_TIMEOUT_MS: 60000,
      ML_REMOVE_URL: '',
    });
    global.fetch = jest.fn();
  });

  it('harus mengirim JSON { employeeId, name, photos: [url] } ke sync-ml', async () => {
    (global.fetch as jest.Mock).mockResolvedValue(
      new Response(
        JSON.stringify({ success: true, message: 'ok', data: {} }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      ),
    );

    const result = await service.registerEmployee({
      employeeId: 'EMP-001',
      name: 'Budi Santoso',
      photos: ['https://supabase/faces/1.jpg', 'https://supabase/faces/2.jpg'],
    });

    expect(global.fetch).toHaveBeenCalledTimes(1);
    const [url, init] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).toBe('http://ml/api/v1/employees/sync-ml');
    expect(init.method).toBe('POST');
    expect(init.headers['content-type']).toBe('application/json');
    expect(JSON.parse(init.body)).toEqual({
      employeeId: 'EMP-001',
      name: 'Budi Santoso',
      photos: ['https://supabase/faces/1.jpg', 'https://supabase/faces/2.jpg'],
    });
    expect(result.ok).toBe(true);
    expect(result.photosSent).toBe(2);
  });

  it('harus menandai gagal jika ML_REGISTER_ENABLED false', async () => {
    Object.assign(env, { ML_REGISTER_ENABLED: false });

    const result = await service.registerEmployee({
      employeeId: 'EMP-001',
      name: 'Budi',
      photos: ['https://supabase/faces/1.jpg'],
    });

    expect(global.fetch).not.toHaveBeenCalled();
    expect(result.ok).toBe(false);
  });

  it('harus menandai gagal jika tidak ada photos', async () => {
    const result = await service.registerEmployee({
      employeeId: 'EMP-001',
      name: 'Budi',
      photos: [],
    });

    expect(global.fetch).not.toHaveBeenCalled();
    expect(result.ok).toBe(false);
    expect(result.photosSent).toBe(0);
  });

  it('harus menangani kegagalan tanpa melempar error', async () => {
    (global.fetch as jest.Mock).mockRejectedValue(new Error('ECONNREFUSED'));

    const result = await service.registerEmployee({
      employeeId: 'EMP-001',
      name: 'Budi',
      photos: ['https://supabase/faces/1.jpg'],
    });

    expect(result.ok).toBe(false);
    expect(result.message).toContain('Gagal');
  });

  it('removeEmployee harus dilewati jika ML_REMOVE_URL kosong', async () => {
    const result = await service.removeEmployee({
      employeeId: 'EMP-001',
      name: 'Budi',
    });

    expect(global.fetch).not.toHaveBeenCalled();
    expect(result.ok).toBe(false);
    expect(result.message).toContain('ML_REMOVE_URL');
  });

  it('removeEmployee harus mengirim JSON { employeeId, name } ke ML_REMOVE_URL', async () => {
    Object.assign(env, { ML_REMOVE_URL: 'http://ml/api/v1/employees/remove' });
    (global.fetch as jest.Mock).mockResolvedValue(
      new Response(
        JSON.stringify({ success: true, message: 'ok' }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      ),
    );

    const result = await service.removeEmployee({
      employeeId: 'EMP-001',
      name: 'Budi',
    });

    const [url, init] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).toBe('http://ml/api/v1/employees/remove');
    expect(JSON.parse(init.body)).toEqual({ employeeId: 'EMP-001', name: 'Budi' });
    expect(result.ok).toBe(true);
  });
});
