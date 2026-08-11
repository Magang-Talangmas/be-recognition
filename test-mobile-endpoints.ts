import request from 'supertest';
import { createApp } from './src/app';

const app = createApp();

async function runTests() {
  console.log('=== Menguji API Mobile Login ===');
  const loginRes = await request(app)
    .post('/api/v1/mobile/auth/login')
    .send({
      email: 'budi@test.com',
      password: 'password123'
    });
  
  console.log('Status Login:', loginRes.status);
  console.log('Response Login:', JSON.stringify(loginRes.body, null, 2));

  if (loginRes.status === 200 && loginRes.body.data && loginRes.body.data.token) {
    const token = loginRes.body.data.token;
    
    console.log('\n=== Menguji API Jadwal Hari Ini (Schedule Today) ===');
    const scheduleRes = await request(app)
      .get('/api/v1/mobile/schedule/today')
      .set('Authorization', `Bearer ${token}`);
    
    console.log('Status Jadwal:', scheduleRes.status);
    console.log('Response Jadwal:', JSON.stringify(scheduleRes.body, null, 2));
  } else {
    console.log('Login gagal, pengujian jadwal dihentikan.');
  }
}

runTests().then(() => {
  console.log('\nPengujian selesai.');
  process.exit(0);
}).catch((err) => {
  console.error('Terjadi kesalahan:', err);
  process.exit(1);
});
