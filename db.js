// In-memory user store for the scaffold. Replace with Postgres/Mongo/etc.
// The shape is what matters: key users by google_sub.

const users = new Map(); // id -> user
const bySub = new Map(); // google_sub -> id
let nextId = 1;

export async function upsertUser({ google_sub, email, name, picture }) {
  const existingId = bySub.get(google_sub);
  if (existingId) {
    const u = users.get(existingId);
    Object.assign(u, { email, name, picture }); // refresh profile fields
    return { ...u, isNew: false };
  }
  const id = String(nextId++);
  const user = { id, google_sub, email, name, picture, createdAt: Date.now() };
  users.set(id, user);
  bySub.set(google_sub, id);
  return { ...user, isNew: true };
}

export async function getUser(id) {
  return users.get(id) || null;
}

/*
 Production version with Postgres (using the `pg` package) would be roughly:

 export async function upsertUser({ google_sub, email, name, picture }) {
   const { rows } = await pool.query(
     `INSERT INTO users (google_sub, email, name, picture)
      VALUES ($1,$2,$3,$4)
      ON CONFLICT (google_sub)
      DO UPDATE SET email=$2, name=$3, picture=$4
      RETURNING *, (xmax = 0) AS "isNew"`,
     [google_sub, email, name, picture]
   );
   return rows[0];
 }
*/
