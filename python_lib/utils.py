# utility関数
import datetime
import json

# 現在時刻の文字列を取得
def current_time_string():
    dt = str(datetime.datetime.now()).replace(' ', '-').replace(':', '-').replace('.', '-')
    return dt


# JSONを書き込み
def read_json(filename):
    f = open(filename, 'r')
    data = json.load(f)
    f.close()
    return data

# JSONを読み込み
def write_json(filename, data):
    with open(filename, 'w') as f:
        f.write( json.dumps(data, indent=4) )
