import { MongoClient } from 'mongodb';

const uri = 'mongodb://localhost:27017';
const dbName = 'workhive';

async function run() {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    const db = client.db(dbName);

    const usersRes = await db.collection('users').deleteMany({ email: { $regex: '^e2e_' } });
    console.log('Deleted users:', usersRes.deletedCount);

    const roomsRes = await db.collection('rooms').deleteMany({ tags: 'e2e' });
    console.log('Deleted rooms:', roomsRes.deletedCount);

    const artifactsRes = await db.collection('artifacts').deleteMany({ tags: 'e2e' });
    console.log('Deleted artifacts:', artifactsRes.deletedCount);

    // fallback: delete rooms/artifacts with title starting with 'E2E Room'
    const roomsRes2 = await db.collection('rooms').deleteMany({ title: { $regex: '^E2E Room' } });
    console.log('Deleted rooms (title match):', roomsRes2.deletedCount);

    const artifactsRes2 = await db.collection('artifacts').deleteMany({ title: { $regex: '^E2E Room' } });
    console.log('Deleted artifacts (title match):', artifactsRes2.deletedCount);

  } catch (err) {
    console.error(err);
    process.exitCode = 1;
  } finally {
    await client.close();
  }
}

run();
