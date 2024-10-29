import db

def get_all_users():
    # Fetch data from the database
    mysql = db.connect()
    cur = mysql.cursor()
    cur.execute("SELECT * FROM Users")
    users = cur.fetchall()
    cur.close()
    mysql.close()
    return users
    #return render_template('index.html', users=users)

def add_user(name, email):
    mysql = db.connect()
    cur = mysql.cursor()
    cur.execute("INSERT INTO Users (name, email) VALUES (%s, %s)", (name, email))
    mysql.commit()
    cur.close()
    mysql.close()
    return "User added successfully!"
