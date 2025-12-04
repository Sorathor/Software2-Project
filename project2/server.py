from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

import mysql.connector
@app.route('/journal', methods=['GET'])
def get_journal():
    db = mysql.connector.connect(
        host="localhost",
        user="root",
        passwd="123",
        database="creature_catcher"
    )
    cursor = db.cursor()
    cursor.execute("""SELECT a.id AS SN, a.name AS name, b.name AS type FROM creatures a LEFT JOIN types b ON a.id = b.id""")
    result=cursor.fetchall()
    print(result)
    return jsonify(result)
if __name__ == '__main__':
    app.run(debug=True)