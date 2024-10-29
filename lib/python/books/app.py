from flask import Flask, render_template, request
import books
import json

app = Flask(__name__)

@app.route('/')
def index():
    # Fetch data from the database
    try:
      return books.get_all_books()
    except:
      return json.dumps([{"name": "dummy"}])

@app.route('/books', methods=['POST'])
def add_book():
    title = request.json['title']
    author = request.json['author']
    genre = request.json['genre']
    response = books.add_book(title, author, genre)
    return response

if __name__ == '__main__':
    app.run(debug=True,port=5001, host='0.0.0.0')
