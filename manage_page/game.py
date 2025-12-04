import mysql.connector

connection = mysql.connector.connect(
         host='127.0.0.1',
         port= 5000,
         database='creature_catcher',
         user='root',
         password='metro',
         autocommit=True
         )

cursor = connection.cursor()

player_id = 1

cursor.execute("Insert ignore into players (id, username) values (1,'player1)")

for i in range (1,5):
    cursor.execute(
        "Insert ignore into habitats (payer_id"
    )