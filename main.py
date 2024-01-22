from flask import Flask, request, render_template, redirect, url_for
app = Flask(__name__)

import datetime
import json
import os


# 起動方法
# $ python3 main.py 
# http://localhost


@app.route('/', methods=["GET", "POST"])
def hello():
    if request.method == "POST":
        #print( request.form['result'] )
        time_str = str(datetime.datetime.now()).replace(' ', '-').replace(':', '-').replace('.', '-')
        filename = 'generate-'+time_str+'.json'
        with open('static/json/'+filename, 'w', encoding='UTF-8') as f:
            f.write(request.form['result'])
        return redirect(url_for('hello'))

    return render_template('index.html')


@app.route('/demo')
def demo():
    return render_template('demo.html')


@app.route('/admin')
def admin():
    return render_template('admin.html')




@app.route('/replay')
def replay():
    return render_template('replay.html')




@app.route('/json/list.json')
def json_list():
    # JSONを表示
    dirs = os.listdir(path='static/json')
    dirs.sort()
    res = [s for s in dirs if '.json' in s]
    return json.dumps(res, indent=4)


@app.route('/replay/list.json')
def result_list():
    # JSONを表示
    '''
    dirs = os.listdir(path='static/results')
    dirs.sort()
    res = [s for s in dirs if '.json' in s]
    '''
    all_files = []

    for curDir, dirs, files in os.walk("static/results", topdown=False):
        #print('===================')
        #print("現在のディレクトリ: ", curDir)
        #print("内包するディレクトリ:", dirs)
        #print("内包するファイル: ", files)
        
        dirname = curDir + '/'
        all_files += [(dirname+s)[15:] for s in files if s.endswith('.json') and not (s.endswith('stats.json'))]

    all_files.sort()
    #print(all_files)
    return json.dumps(all_files, indent=4)


if __name__ == "__main__":
    app.run(debug=False, host='0.0.0.0', port=80)
    #app.run(debug=True)
