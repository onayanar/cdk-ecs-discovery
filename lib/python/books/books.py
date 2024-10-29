import db

def get_all_books():
    # Fetch data from the database
    mysql = db.connect()
    cur = mysql.cursor()
    cur.execute("SELECT * FROM Book")
    books = cur.fetchall()
    cur.close()
    mysql.close()
    return books
    #return render_template('index.html', users=users)

def add_user(title, author, genre):
    mysql = db.connect()
    cur = mysql.cursor()
    cur.execute("INSERT INTO Book (title, author, genre) VALUES (%s, %s, %s)", (title, author, genre))
    mysql.commit()
    cur.close()
    mysql.close()
    return "User added successfully!"
