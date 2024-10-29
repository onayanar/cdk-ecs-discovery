from flask import Flask, render_template, request
import users
import json

app = Flask(__name__)

@app.route('/')
def index():
    # Fetch data from the database
    try:
      return users.get_all_users()
    except:
      return json.dumps([{"name": "dummy"}])

@app.route('/users', methods=['POST'])
def add_user():
    name = request.json['name']
    email = request.json['email']
    response = users.add_user(name, email)
    return response

if __name__ == '__main__':
    app.run(debug=True,port=5000, host='0.0.0.0')
