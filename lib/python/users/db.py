import mysql.connector
import os

def connect():
    cnx = mysql.connector.connect(
        host=os.environ["DBHOST"],
        port=3306,
        user=os.environ["DBUSER"],
        database=os.environ["DBNAME"],
        password=os.environ["DBPASSWORD"])
    return cnx
