from flask import Flask, jsonify, render_template

app = Flask(__name__, template_folder='templates', static_folder='static')

@app.route('/manage')
def manage_page():
    return render_template('manage.html')

@app.route('/manage/data')
def display_data():
    data = {
        "habitats": {
            "h1s1": {"name": "Spriggle", "image": "/static/images/spriggle.png"},
            "h1s2": None,
            "h1s3": None,
            "h1s4": None,

            "h2s1": None,
            "h2s2": None,
            "h2s3": None,
            "h2s4": None,

            "h3s1": None,
            "h3s2": None,
            "h3s3": None,
            "h3s4": None,

            "h4s1": None,
            "h4s2": None,
            "h4s3": None,
            "h4s4": None,

            "unplaced": [
                # empty for now
            ]
        }
    }
    return jsonify(data)

if __name__ == "__main__":
    app.run(debug=True)

