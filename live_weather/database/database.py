import sqlite3
import os

DB_NAME = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'weather.db')

def get_db_connection():
    """Establish and return a connection to the SQLite database."""
    conn = sqlite3.connect(DB_NAME)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    """Initialize database tables if they do not already exist."""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Create search_history table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS search_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            city TEXT NOT NULL,
            country TEXT,
            searched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # Create favorites table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS favorites (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            city TEXT NOT NULL UNIQUE,
            country TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    conn.commit()
    conn.close()

def add_search_history(city, country=""):
    """Add a city search record to search_history table."""
    if not city:
        return
    city_clean = city.strip().title()
    country_clean = country.strip().upper() if country else ""
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Delete any duplicate existing search for the same city to keep recent list unique & fresh
    cursor.execute('''
        DELETE FROM search_history WHERE LOWER(city) = LOWER(?)
    ''', (city_clean,))
    
    cursor.execute('''
        INSERT INTO search_history (city, country) VALUES (?, ?)
    ''', (city_clean, country_clean))
    
    conn.commit()
    conn.close()

def get_recent_searches(limit=5):
    """Retrieve the most recent searched cities."""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute('''
        SELECT id, city, country, searched_at 
        FROM search_history 
        ORDER BY id DESC 
        LIMIT ?
    ''', (limit,))
    
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]

def add_favorite(city, country=""):
    """Add a city to favorite_cities list."""
    if not city:
        return None
    city_clean = city.strip().title()
    country_clean = country.strip().upper() if country else ""
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute('''
            INSERT INTO favorites (city, country) VALUES (?, ?)
        ''', (city_clean, country_clean))
        conn.commit()
        fav_id = cursor.lastrowid
    except sqlite3.IntegrityError:
        # Already in favorites, get its ID
        cursor.execute('SELECT id FROM favorites WHERE LOWER(city) = LOWER(?)', (city_clean,))
        row = cursor.fetchone()
        fav_id = row['id'] if row else None
    finally:
        conn.close()
        
    return fav_id

def get_favorites():
    """Retrieve all favorite cities."""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute('''
        SELECT id, city, country, created_at 
        FROM favorites 
        ORDER BY created_at DESC
    ''')
    
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]

def delete_favorite(fav_id):
    """Delete a favorite city by ID or city name."""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    if isinstance(fav_id, int) or (isinstance(fav_id, str) and fav_id.isdigit()):
        cursor.execute('DELETE FROM favorites WHERE id = ?', (int(fav_id),))
    else:
        cursor.execute('DELETE FROM favorites WHERE LOWER(city) = LOWER(?)', (str(fav_id).strip(),))
        
    deleted_count = cursor.rowcount
    conn.commit()
    conn.close()
    return deleted_count > 0
