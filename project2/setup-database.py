"""
Quick setup script to initialize the creature_catcher database
Run this before starting the game for the first time
"""

import pymysql


def setup_database():
    """Create and initialize the database"""

    # Connection details - UPDATE THESE
    DB_HOST = 'localhost'
    DB_USER = 'root'
    DB_PASSWORD = '123'  # <-- UPDATE WITH YOUR PASSWORD
    DB_NAME = 'creature_catcher'

    try:
        # Connect to MariaDB (without selecting a database)
        print("Connecting to MariaDB...")
        connection = pymysql.connect(
            host=DB_HOST,
            user=DB_USER,
            password=DB_PASSWORD,
           database=DB_NAME
        )

        with connection.cursor() as cursor:
            # Create database
            print(f"Creating database '{DB_NAME}'...")
            cursor.execute(f"CREATE DATABASE IF NOT EXISTS {DB_NAME}")
            cursor.execute(f"USE {DB_NAME}")

            print("Reading SQL schema file...")
            # You can paste the SQL here or read from file
            # For now, let's read from the schema file
            try:
                with open('Software2-Project\creature_schema.sql', 'r') as f:
                    sql_content = f.read()

                # Split by semicolons and execute each statement
                statements = [s.strip() for s in sql_content.split(';') if s.strip()]

                for i, statement in enumerate(statements, 1):
                    try:
                        cursor.execute(statement)
                        if i % 10 == 0:
                            print(f"  Executed {i}/{len(statements)} statements...")
                    except Exception as e:
                        print(f"  Warning: Statement {i} failed: {str(e)[:50]}")

                connection.commit()
                print(f"✅ Database setup complete!")

                # Verify tables
                cursor.execute("SHOW TABLES")
                tables = cursor.fetchall()
                print(f"\n📊 Created {len(tables)} tables:")
                for table in tables:
                    print(f"  - {table[0]}")

                # Verify creatures
                cursor.execute("SELECT COUNT(*) as count FROM creatures")
                count = cursor.fetchone()[0]
                print(f"\n🎮 Loaded {count} creatures")

                # Show a sample
                cursor.execute("SELECT name, type_id FROM creatures LIMIT 5")
                print("\nSample creatures:")
                for creature in cursor.fetchall():
                    print(f"  - {creature[0]} (Type {creature[1]})")

            except FileNotFoundError:
                print("⚠️  Could not find 'creature_schema.sql'")
                print("Please make sure the SQL file is in the same directory")
                print("Or paste the SQL content directly into this script")

        connection.close()
        print("\n✨ Setup complete! You can now run the game.")

    except Exception as e:
        print(f"\n❌ Error: {e}")
        print("\nTroubleshooting:")
        print("1. Make sure MariaDB/MySQL is running")
        print("2. Check your database credentials")
        print("3. Verify you have permissions to create databases")


if __name__ == "__main__":
    print("\n🌟 Creature Sanctuary Database Setup 🌟\n")
    setup_database()
