# Banking homework: SQL + MongoDB

A simple university project: **10 Oracle tables, an ERD, 10 queries with 4 JOINs each, and a basic MongoDB CRUD website**. No React, frontend build step, login system or payment integration.

## Files you need

| File | What it does |
|---|---|
| [docs/erd.md](docs/erd.md) | Diagram of all 10 tables, fields and relationships |
| [sql/01_schema.sql](sql/01_schema.sql) | Creates the 10 Oracle tables |
| [sql/02_seed.sql](sql/02_seed.sql) | Adds 35 fictional records |
| [sql/03_queries.sql](sql/03_queries.sql) | 10 numbered queries; **exactly 4 JOIN clauses per query** |
| [sql/04_verify.sql](sql/04_verify.sql) | Checks row counts, references and table definitions |
| [scenario/banking.js](scenario/banking.js) | Names, fields, types, labels, references and sample data |
| [server.js](server.js) | Node/Express backend connected to MongoDB |
| [public/](public/) | Plain HTML, CSS and JavaScript frontend |

**Oracle and MongoDB are separate.** The website edits MongoDB only. Both databases start with the same sample data, but changes are not synchronized.

## 1. Understand the diagram

Open [the ERD](docs/erd.md) on GitHub.

| Table / collection | Meaning | Sample records |
|---|---|---:|
| branches | Bank locations | 3 |
| customers | Customers | 4 |
| employees | Employees working at branches | 3 |
| account_types | Current, Savings, Student | 3 |
| accounts | Accounts, balances, branches and types | 4 |
| account_holders | Links customers to accounts, including joint accounts | 5 |
| transactions | Deposits and withdrawals | 4 |
| loan_types | Personal, Home, Education | 3 |
| loans | Loans belonging to customers | 3 |
| loan_payments | Payments from accounts toward loans | 3 |

Every record has a numeric primary key `id`. A foreign key points to another record's ID. For example, `accounts.branch_id` points to `branches.id`. `account_holders` handles the many-to-many relationship: a customer can have multiple accounts, and an account can have multiple customers.

A transaction's employee is optional for self-service; other references are required. Delete a parent only after removing or reassigning its children. The app does not automatically delete related records.

## 2. Run the Oracle part first

Log in to **your own Oracle Academy/APEX workspace**. No password goes in this repository.

1. Open **SQL Workshop -> SQL Scripts**.
2. Upload and run `sql/01_schema.sql`. Check the results: 10 tables should be created.
3. Upload and run `sql/02_seed.sql` **once**. Include the whole block and its final `/`.
4. Run `sql/04_verify.sql`. All actual counts should match expected counts (35 records total); all orphan counts should be zero.
5. Run `sql/03_queries.sql`. You can also copy one numbered SELECT at a time into **SQL Commands**.
6. Use **Object Browser** to inspect the tables and their data.

Tables have the prefix `HW_` so they do not replace typical lab tables. **If any of these exact `HW_*` names already exist, inspect them before running setup.** Creation never drops existing tables. Do not rerun the schema or seed on every demo. Oracle DDL commits immediately; if a script fails partway, inspect its results before retrying.

The scripts use introductory Oracle patterns: `VARCHAR2`, `NUMBER`, `DATE`, `TO_DATE`, `NVL` and `TO_CHAR`. For APEX, `04_verify.sql` uses dictionary queries instead of the SQL*Plus-only `DESCRIBE` command.

### What each query demonstrates

| # | Explanation | Expected rows |
|---|---|---:|
| 1 | INNER: accounts with holders, customers, branches and account types | 5 |
| 2 | LEFT: all customers, including Victor who has no account | 6 |
| 3 | RIGHT: all branches, including New Town which has no accounts | 6 |
| 4 | Mixed: transactions, retaining self-service records with no employee | 4 |
| 5 | INNER: loans with borrower, branch, product and advisor | 3 |
| 6 | INNER: payments with loan, borrower, paying account and account branch | 3 |
| 7 | LEFT: unused Education loan type and loan 2 with no payments | 5 |
| 8 | FULL OUTER: account types and accounts, including unused Student type | 6 |
| 9 | LEFT: employees' loans, retaining employees with no loans and empty branches | 5 |
| 10 | Counts of transactions and payments per account | 4 |

INNER keeps matches only. LEFT keeps every row on the left; RIGHT keeps every row on the right; FULL OUTER keeps both sides. Missing matches appear as `NULL`. Query 8 has no orphan accounts because foreign keys prevent them.

Query 10 uses `COUNT(DISTINCT ...)` because joining two child tables can multiply rows. Accounts 1-4 should have transaction/payment counts `(2,2)`, `(1,0)`, `(0,1)`, `(1,0)`. Counts above assume the unchanged sample data.

## 3. Run MongoDB and the website

Install **Node.js 24 LTS** (minimum 22.13) and **Docker Desktop**. Open this repository in VS Code and use its terminal.

Get the latest homework branch:

```sh
git fetch origin
git switch mki21-banking-homework
git pull --ff-only
npm ci
```

If the branch is not local yet, use `git switch --track origin/mki21-banking-homework` instead.

Start Docker Desktop, then run these **in order** from the repository folder:

```sh
docker compose up -d --wait
npm run seed
npm start
```

Open **http://127.0.0.1:3000**. That's it: the backend serves the frontend too.

`npm run seed` creates the 10 collections and adds the 35 records. It refuses if any collection already contains records, so it will not overwrite your work. **Seed once; on later runs, just start MongoDB and run `npm start`.**

If MongoDB is already installed locally on port 27017, skip Docker. To use a different MongoDB URI/database/port, copy `.env.example` to `.env` and edit it; Node loads it automatically. On macOS/Linux use `cp .env.example .env`; on PowerShell use `Copy-Item .env.example .env`. An Atlas connection URI may be used here too. Never commit passwords or show the URI during screen sharing. Database names must begin with `hw_`.

### Practice CRUD

1. Select **Customers**, enter ID `100`, name `Demo Student`, email `demo@example.test`, then **Save**.
2. Refresh the page: the record is still there in MongoDB.
3. Click **Edit**, change the name and save.
4. Click **Delete** on that record and confirm.
5. Select **Accounts**: branch and account type are dropdowns of existing records.
6. Try deleting branch 1: the app explains that related records still reference it.

IDs are manually entered positive integers and cannot be edited. Required fields, references, unique values, dates and amounts are validated. Blank employee is allowed for a self-service transaction. Duplicate IDs/emails/account numbers and duplicate customer-account holder pairs are rejected.

MongoDB stores an internal `_id` plus our numeric `id`; references use `id` to match the SQL model. Dates are `YYYY-MM-DD` strings in MongoDB and `DATE` values in Oracle.

### See the collections directly

```sh
docker compose exec mongo mongosh hw_banking
```

Then, inside `mongosh`:

```javascript
show collections
db.customers.find({}, { _id: 0 })
db.accounts.find({}, { _id: 0 })
db.getCollectionNames().sort().map(name => ({
  collection: name, rows: db.getCollection(name).countDocuments({})
}))
```

Optional MongoDB reference lookup:

```javascript
db.accounts.aggregate([
  { $lookup: { from: "branches", localField: "branch_id", foreignField: "id", as: "branch" } },
  { $project: { _id: 0, account_number: 1, "branch.name": 1 } }
])
```

MongoDB Compass can also connect to `mongodb://127.0.0.1:27017` and open `hw_banking`.

Stop the website with **Ctrl+C** and MongoDB with `docker compose stop`. Resume with `docker compose start` and `npm start`. The Docker volume preserves your documents. **Do not use `docker compose down -v` unless you intend to erase them.**

## 4. Check the project

```sh
npm test
npm run check:generated
# With MongoDB running:
npm run test:integration
```

The first checks the ten entities, 35 valid sample records, generated files, invalid input, four JOINs per query and expected join results. Join results are checked using SQLite compatibility functions, **not a remote Oracle connection**. Run the actual Oracle scripts in your own workspace too.

The integration check uses real MongoDB: seeding, CRUD on all ten collections, persistence, duplicate values, missing references and deletion errors. It creates and removes only a fresh `hw_test_...` database, leaving your `hw_banking` data alone.

## 5. Customize for another scenario

Edit **`scenario/banking.js`**, not the shared frontend/backend:

- Change labels, e.g. `name: text('Student full name')`.
- Add fields, e.g. `phone: text('Contact phone', 24)`, and add values to the corresponding sample records. For optional fields set `required: false` and use `null`.
- Supported types: `text`, `integer`, `money`, `date`; `enum` gives a dropdown. `ref('Department', 'departments')` gives a relationship dropdown.
- For education/hospital, change entity names, fields, reference targets, display fields and sample records consistently. Put parent entities before children; circular references are not supported. Keep 10 meaningful entities for this assignment.

Then run:

```sh
npm run generate
npm test
```

Generation updates the Oracle schema/seed/check/reset files and ERD. **The business questions in `03_queries.sql`, expected results in tests, and scenario explanations in README need manual updates.** Names/prefixes must be valid Oracle identifiers, within 30 characters; avoid reserved words.

Use a **new database**, such as `hw_education`, in `.env`, then seed and restart. Use a clean Oracle schema or a different prefix plus manually updated queries. Generation writes files only; it does not migrate existing data or rename old MongoDB collections/indexes.

## 6. Teams demo order

Before the call, log in to Oracle and start MongoDB/the website. Share windows without passwords.

1. **ERD:** explain the 10 entities, primary/foreign keys and joint account relationship.
2. **Oracle:** show tables, run `04_verify.sql`, then run queries 1, 2, 3 and 8 to compare joins. Point out the unmatched customer, branch and product. Open the other exercises too.
3. **Website:** create customer 100, edit it, refresh to show persistence, then delete it. Show the relationship dropdowns and a blocked branch deletion.
4. **MongoDB:** show the 10 collections and documents in `mongosh` or Compass.
5. **Scenario file:** explain that fields/labels are shared, while banking-specific SQL queries are written separately.

Oracle demonstrates relational constraints and joins; the website demonstrates NoSQL CRUD. They are two parts of the homework, not two views of one live synchronized database.

## Troubleshooting and safety

| Problem | What to do |
|---|---|
| Connection refused / server selection timeout | Start MongoDB; check Docker Desktop, URI and port. There is no memory fallback. |
| Port 27017 is busy | Use your existing MongoDB server instead of starting a second one. |
| Port 3000 is busy | Set `PORT=3001` in `.env`, restart and open that port. |
| Seed says "not empty" | Normal: skip seeding and run `npm start`. |
| Seed was interrupted | Some records may remain. Use a new `hw_...` database for a clean start; do not overwrite existing data. |
| Duplicate value / cannot delete | Choose a unique value, or remove/reassign the referencing child records first. |
| Oracle ORA-00955 | A table already exists. Inspect it; never blindly drop previous lab work. |
| Oracle ORA-00001 / ORA-02291 / ORA-02292 | Duplicate value / missing parent / referenced parent deletion. Check IDs and execution order. |
| Generated files differ | Run `npm run generate`, review the changes and commit them. |
| Integration permissions error | The MongoDB user needs permission to create/drop its temporary test database; use local MongoDB if Atlas restrictions prevent this. |

**Fresh data without deletion:** change `.env` to a new dedicated name such as `hw_banking_practice2`, seed, restart.

**Oracle reset is optional and destructive:** [99_reset_OPTIONAL.sql](sql/99_reset_OPTIONAL.sql) refuses by default. Only if the ten named tables are disposable and yours, change the confirmation constant in a private copy as instructed there. Oracle drops cannot be rolled back; a failure may leave a partial reset.

**MongoDB reset is optional and destructive:** stop the app, open `mongosh`, select and verify the exact disposable homework database, and deliberately run `db.dropDatabase()`. This removes all its data. Never do this on a shared database. Then reseed.

This is a local classroom demo, not production banking. Use fictional data and keep the website/database on loopback; there is no authentication. Creating transactions/payments does **not** move money or recalculate balances. MongoDB references/deletion rules are enforced by this single app process; direct database writes bypass them. The UI supports up to 500 records per collection. Oracle Academy execution and the Teams call require your own login and rehearsal.