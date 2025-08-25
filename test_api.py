import requests
import json

def test_api():
    try:
        # Test if Flask app is running
        response = requests.get('http://localhost:5000/', timeout=5)
        print('Flask app is running, status:', response.status_code)
        
        # Test next week matches endpoint
        response = requests.get('http://localhost:5000/api/next-week-matches')
        print('Next week matches status:', response.status_code)
        if response.status_code == 200:
            data = response.json()
            print('Response keys:', list(data.keys()))
            if 'matches' in data:
                print('Number of matches:', len(data['matches']))
                if data['matches']:
                    print('First match:', data['matches'][0])
            else:
                print('No matches key in response')
        else:
            print('Error response:', response.text)
            
    except Exception as e:
        print('Error:', e)

if __name__ == '__main__':
    test_api()