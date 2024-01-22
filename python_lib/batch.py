import json
import os
import datetime
import math

from argparse import ArgumentParser

import themepark as tpp


# バッチファイルにて実行


##########################
# Usage: 
# $ python3 python_lib/batch.py -i python_lib/simulation_params/sim_param_test.json
##########################


def get_option():
    argparser = ArgumentParser()
    argparser.add_argument('-i', '--input', type=str,
                           help='Input json path (relative path)', 
                           required=True)
    argparser.add_argument('--debug',
                           default=False,
                           help='Debug mode (true or false)',
                           action="store_true")
    return argparser.parse_args()


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


def aggregate(data):
    # データを集計して平均、分散をとる
    results = {}
    
    # 平均, 分散
    results['average'] = {}
    results['variance'] = {}
    results['stddev'] = {}
    
    # キーごとに計算
    for key in data[0].keys():
        if not (type(data[0][key]) is list):
            # 平均の計算
            average = 0
            for d in data:
                average += d[key]
            average /= len(data)
            results['average'][key] = average

            # 分散の計算
            variance = 0
            for d in data:
                variance += (d[key] - average) ** 2
            variance /= len(data)
            results['variance'][key] = variance

            # 標準偏差
            results['stddev'][key] = math.sqrt(variance)

    return results


if __name__ == '__main__':
    # パースした引数を取得
    args = get_option()

    # 実験パラメータのJSONファイルのパスを入れる
    exp_data = read_json(args.input)
    print(exp_data)

    # フォルダを作成
    output_path = exp_data['output_path'] #+ '-' + str(datetime.datetime.now()).replace(' ', '-').replace(':', '-').replace('.', '-')
    os.makedirs(output_path)

    # テーマパークのJSONファイルを読み込み
    basic_data = read_json(exp_data['json_filename'])

    # 第3引数に -debug モード
    debug = args.debug

    stats_list = []

    # シミュレーションスタート
    for i in range( exp_data['num_of_exp'] ):
        print('#'+str(i))
        themepark = tpp.Themepark(basic_data, output_path + '/' +exp_data['exp_name'] + '-' + str(i)+'.json', debug)
        themepark.initial_process()
        themepark.start()
        #print(themepark.stats())
        stats_list.append( themepark.stats() )

    # データの集計
    results = aggregate(stats_list)
    print( json.dumps(results, indent=4) )

    # ファイルに書き込み
    write_json(output_path + '/' +exp_data['exp_name'] + '-stats.json', results)
