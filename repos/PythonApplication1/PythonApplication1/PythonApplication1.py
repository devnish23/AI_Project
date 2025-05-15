import requests
import pandas as pd
from bs4 import BeautifulSoup

# URL for Microsoft Update Catalog (Windows Server 2019 updates)
MICROSOFT_UPDATE_URL = "https://www.catalog.update.microsoft.com/Search.aspx?q=Windows%20Server%202019"

def get_updates():
    headers = {
        "User-Agent": "Mozilla/5.0"
    }
    
    # Request the webpage
    response = requests.get(MICROSOFT_UPDATE_URL, headers=headers)
    
    if response.status_code != 200:
        print("Failed to fetch data from Microsoft Update Catalog.")
        return []
    
    soup = BeautifulSoup(response.text, "html.parser")
    
    # Extract update details
    updates = []
    for item in soup.find_all("tr", class_="dataRow"):
        columns = item.find_all("td")
        if len(columns) < 6:
            continue  # Skip incomplete rows
        
        kb_number = columns[1].text.strip()
        title = columns[2].text.strip()
        classification = columns[3].text.strip()
        last_updated = columns[4].text.strip()
        size = columns[5].text.strip()
        
        updates.append({
            "KB Number": kb_number,
            "Title": title,
            "Classification": classification,
            "Last Updated": last_updated,
            "Size": size
        })
    
    return updates

def save_to_excel(updates):
    if not updates:
        print("No updates found. Skipping Excel file creation.")
        return
    
    df = pd.DataFrame(updates)
    file_name = "Windows_2019_Patches.xlsx"
    df.to_excel(file_name, index=False)
    print(f"Saved updates to {file_name}")

if __name__ == "__main__":
    updates = get_updates()
    save_to_excel(updates)

