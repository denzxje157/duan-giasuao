import os
from supabase import create_client
from dotenv import load_dotenv

load_dotenv('.env.local')
supabase = create_client(os.getenv('SUPABASE_URL'), os.getenv('SUPABASE_KEY'))

def test_insert():
    profile_id = 'f6a81f23-1099-4854-86bb-d90b80ba1c8a'
    doc_data = {
        "name": "test_insert_doc.pdf",
        "pdf_url": "https://example.com/test.pdf",
        "thumbnail_url": "",
        "grade": "12",
        "status": "ready",
        "user_id": profile_id
    }
    
    try:
        print("Inserting document...")
        res = supabase.table("documents").insert(doc_data).execute()
        print("Insert Success! Returned data:")
        print(res.data)
        
        # Clean up
        if res.data:
            doc_id = res.data[0]['id']
            print(f"Deleting test document {doc_id}...")
            supabase.table("documents").delete().eq("id", doc_id).execute()
            print("Cleanup completed.")
    except Exception as e:
        print(f"Insert Failed: {e}")

test_insert()
