import random
import math
import json
import sys

from argparse import ArgumentParser


##########################
# Usage: 
# $ python3 python_lib/themepark.py -i static/json/themepark-simple.json -o static/results/log-themepark-simple-test.json --debug
##########################


def get_option():
    argparser = ArgumentParser()
    argparser.add_argument('-i', '--input', type=str,
                           help='Input json path (relative path)', 
                           required=True)
    argparser.add_argument('-o', '--output', type=str,
                           help='Output json path (relative path)', 
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



# テーマパークのクラス
class Themepark:

    def __init__(self, data, output_path, debug, logging=True):
        self.data  = data
        self.output_path = output_path
        self.debug = debug
        self.logging = logging

        self.dijkstra_results = []


    def initial_process(self):
        # 時刻 t
        self.t = 0

        # 取得したデータからアトラクションの待ち行列を作成
        self.attractions = []

        for i in range(len(self.data['themepark']['attractions'])):
            a = self.data['themepark']['attractions'][i]
            
            # キャパシティ -1 は Infinity
            capacity = float('inf') if a['capacity'] == -1 else a['capacity']

            self.attractions.append( Attraction(a['id'], a['name'], a['type'], capacity, a['service_time'], self) )

        # 入口・出口
        self.entrance = self.attractions[self.data['themepark']['entrance_id']]
        self.exit = self.attractions[self.data['themepark']['exit_id']]

        self.adjoint_matrix = self.data['themepark']['links']

        # visitorの定義
        self.visitors = []
        self.max_of_visitors = self.data['visitors']['max_of_visitors']
        self.num_of_initial_visitors = self.data['visitors']['num_of_initial_visitors']
        self.num_of_visitors = 0

        # 初期人数の分だけビジターを追加する
        for _ in range(self.num_of_initial_visitors):
            self.add_new_visitor()



    # 実験結果を出力する関数
    def stats(self):
        stats_data = {}

        stats_data['time'] = self.t

        stats_data['sum_of_visiting_time'] = 0
        stats_data['sum_of_moving_time'] = 0
        stats_data['sum_of_waiting_time'] = 0
        stats_data['sum_of_service_time'] = 0

        stats_data['average_of_visiting_time'] = 0
        stats_data['average_of_moving_time'] = 0
        stats_data['average_of_waiting_time'] = 0
        stats_data['average_of_service_time'] = 0

        stats_data['visiting_time'] = []
        stats_data['moving_time'] = []
        stats_data['waiting_time'] = []
        stats_data['service_time'] = []
        

        n = self.num_of_visitors

        for v in self.visitors:
            vt = (v.exit_t - v.entering_t)
            st = (v.exit_t - v.entering_t) - v.mt - v.wt

            stats_data['sum_of_visiting_time'] += vt
            stats_data['sum_of_moving_time'] += v.mt
            stats_data['sum_of_waiting_time'] += v.wt
            stats_data['sum_of_service_time'] += st

            stats_data['average_of_visiting_time'] += vt
            stats_data['average_of_moving_time'] += v.mt
            stats_data['average_of_waiting_time'] += v.wt
            stats_data['average_of_service_time'] += st

            stats_data['visiting_time'].append(vt)
            stats_data['moving_time'].append(v.mt)
            stats_data['waiting_time'].append(v.wt)
            stats_data['service_time'].append(st)

        stats_data['average_of_visiting_time'] /= n
        stats_data['average_of_moving_time'] /= n
        stats_data['average_of_waiting_time'] /= n
        stats_data['average_of_service_time'] /= n

        return stats_data



    # visitorを追加するメソッド
    def add_new_visitor(self):

        # プラン（アトラクションのリスト）
        plan = []
        for i in range(len(self.attractions)):
            if self.attractions[i].type == 'type-attraction':
                plan.append(i)

        if self.data['visitors']['plan_type'] == "random" or self.data['visitors']['plan_type'] == "random-4":
            if self.debug:
                print('Visitor plan: random')
            shuffle(plan)
        
        elif self.data['visitors']['plan_type'] == "ordered":
            # 順序通り(1->2->3->...)
            if self.debug:
                print('Visitor plan: ordered')

        elif self.data['visitors']['plan_type'] == "manual":
            # "plan_manual" で指定した通りのプラン
            if self.debug:
                print('Visitor plan: manual')
            
            new_plan = self.data['visitors']['plan_manual'][self.num_of_visitors]
            plan = []
            for i in range( len(new_plan) ):
                plan.append( new_plan[i] )


        if self.data['visitors']['plan_type'] == "random-4":
            while len(plan) > 4:
                plan.pop()
        
        # ビジターを作成
        new_visitor = Visitor(self.num_of_visitors, '#'+str(self.num_of_visitors), plan, self)

        # visitorsに追加
        self.visitors.append( new_visitor )

        # エントランスに集合
        self.entrance.push_to_a( new_visitor )

        self.num_of_visitors += 1

    
        
    def start(self):
        # シミュレーションスタート
        while True:
            if not self.agent_activity():
                break



    # 次のアトラクションへの移動
    def next_navigation(self, j):
        visitor = self.visitors[j]

        # すでに滞在したアトラクションについては候補から除く
        while visitor.vt[ visitor.attr[0] ] > 0:
            del visitor.attr[0]


        # 次の目的アトラクション
        next_target = visitor.attr[0]

        # 現在の状態csから次の目的アトラクションまでの最短経路
        shortest_path = self.dijkstra(self.adjoint_matrix, visitor.cs, next_target)
        
        # 次に行くべきSegmentを出力
        return shortest_path[1]


    # 条件2, 3の判定
    def condition(self, j, k):

        if ((len(self.attractions[k].a) + 1) <= self.attractions[k].c) and (len(self.attractions[k].queue) == 0):
            # アトラクション k にキャパシティがあり、かつ、k の待ち行列が空である場合
            return True
        
        if ((len(self.attractions[k].a) + 1) <= self.attractions[k].c) and (len(self.attractions[k].queue) != 0):
            # アトラクション k にキャパシティがあり、かつ、
            # エージェント j が k の先頭から min((c_k - a_k), |q_k|) 人以内に並んでいる場合

            minimum = min(self.attractions[k].c - len(self.attractions[k].a),  len(self.attractions[k].queue))

            for i in range(minimum):
                if self.attractions[k].queue[i].id == j:
                    return True

        return False




    # データの可視化
    def display_status(self):
        print('=========================')
        print('t = ' + str(self.t))

        # attraction情報の表示
        for i in range(len(self.attractions)):
            print( self.attractions[i].name + ':', [v.name for v in self.attractions[i].a], ', ', [v.name for v in self.attractions[i].queue] )

        # visitor情報の表示
        for j in range(len(self.visitors)):
            # let total_time = visitors[j].exit_t - visitors[j].entering_t;
            wt = self.visitors[j].wt
            mt = self.visitors[j].mt
            st = self.t - self.visitors[j].entering_t - wt - mt

            if self.visitors[j].exit_t >= 0:
                st =  self.visitors[j].exit_t - self.visitors[j].entering_t - wt - mt

            print( self.visitors[j].name + ': attr: [', self.visitors[j].attr, '], cs: '+ str(self.visitors[j].cs) + ', vt: [', self.visitors[j].vt, '], wt: '+ str(wt) + ', mt: ' + str(mt) + ', st: ' + str(st) + ', enter_t: ' + str(self.visitors[j].entering_t) + ', exit_t: ' + str(self.visitors[j].exit_t) )


    # シミュレーションを実行する関数
    def agent_activity(self):
        
        if self.num_of_visitors < self.max_of_visitors:

            if self.data['visitors']['arrival'] == "poisson":
                # ポアソン過程にしたがってvisitorを追加
                num = min(poisson_process(self.data['visitors']['arrival_rate'], self.max_of_visitors), self.max_of_visitors -self. num_of_visitors)
                
                for j in range(num):
                    self.add_new_visitor()
                
            elif self.data['visitors']['arrival'] == "random":
                rand = math.random()
                if rand < self.data['visitors']['arrival_rate']:
                    self.add_new_visitor()
        
        for j in range(self.num_of_visitors):
            # エージェント j に対して以下を実行

            if self.visitors[j].cs == self.exit.id:
                # 既にゴールしたエージェントは処理が終了
                continue
            
            self.visitors[j].pt = self.visitors[j].pt + 1
            i = self.visitors[j].cs

            if self.attractions[i].st <= self.visitors[j].pt:
                k = self.next_navigation(j)

                if self.condition(j, k):
                    self.visitors[j].wt = self.visitors[j].wt + self.visitors[j].pt - self.attractions[i].st

                    # road or plazaの処理
                    if self.attractions[i].type == 'type-road' or self.attractions[i].type == 'type-plaza':
                        self.visitors[j].mt = self.visitors[j].mt + self.attractions[i].st

                    self.visitors[j].cs = k
                    self.visitors[j].pt = 0
                    self.attractions[k].vt += 1   #（今回は入れない）
                    self.visitors[j].vt[k] += 1   # アトラクション k に滞在した回数を増やす

                    # a_i から j を削除
                    self.attractions[i].remove_from_a(self.visitors[j])

                    # q_k から j を削除
                    self.attractions[k].remove_from_queue(self.visitors[j])

                    # add agent j to a_k 
                    self.attractions[k].push_to_a(self.visitors[j])

                elif not ( self.attractions[k].queue_has(self.visitors[j]) ):
                    self.attractions[k].push_to_queue(self.visitors[j])

                    # a_i から j を削除
                    self.attractions[i].remove_from_a(self.visitors[j])   # 追加してみた
                    # DISCUSSION: アトラクションa_iのサービスが終わったのに「次のアトラクションa_kが空かない」という理由で、q_kに並びつつa_iに居座っているビジターjがいて、そのせいでq_iにいるビジターがサービスを受けられないという問題があった。なので、jはq_kに並んだ段階でa_iから除かなければならない
                    # 川村先生の論文のバグ

        # exitした人数
        num_of_exits = 0

        for j in range(len(self.visitors)):
            if self.visitors[j].cs == self.exit.id:
                if self.visitors[j].exit_t < 0:
                    self.visitors[j].exit_t = self.t
                num_of_exits += 1
        
        if num_of_exits < self.max_of_visitors:
            # 現在の状態を表示
            if self.debug:
                self.display_status()
            # ログを取る
            self.logger()

            self.t += 1
            return True
        
        else:
            if self.debug:
                self.display_status()
            # ログを取る
            self.logger()

            if self.debug:
                print('all exits')

            return False


    # ダイクストラ法による計算
    def dijkstra(self, distance_matrix, s, g):

        for i in range(len(self.dijkstra_results)):
            if self.dijkstra_results[i][0] == s and self.dijkstra_results[i][1] == g:
                return self.dijkstra_results[i][2]

        n = len(distance_matrix)  # num of nodes

        # 結果を保存する変数
        # 変数の初期化
        d = [float('inf') for _ in range(n)] # 暫定距離
        d[s] = 0
        prev = [-1 for _ in range(n)]        # 1つ前のノード
        Q = [i for i in range(n)];    # 未訪問ノード

        # メインの処理
        while len(Q) > 0:
            # Qの中でd[u]が最小の要素uをとる
            u = min(Q, key = lambda v: d[v])
            # Qからuをremoveする
            Q.remove(u)

            # u からのエッジがある V のすべてのノード v 全体に対して以下を実行 
            for v in range(n):
                if distance_matrix[u][v] > 0 and (d[v] > d[u] + distance_matrix[u][v]):
                    d[v] = d[u] + distance_matrix[u][v]
                    prev[v] = u

        # sからすべてのノードへの最短パスを計算
        for i in range(n):
            # 最短パス
            shortest_path = [i]

            g2 = i
            while g2 != s:
                g2 = prev[g2]
                shortest_path.insert(0, g2)  # 先頭から追加

            # 結果を配列に追加
            self.dijkstra_results.append( [s, i, shortest_path] )

        # print(dijkstra_results)

        return self.dijkstra(distance_matrix, s, g)


    def logger(self):
        # loggingがTrueのときだけログを吐き出す
        if not self.logging:
            return

        if self.t == 0:
            # データをログ（JSON形式）に出力する
            self.log_file = open(self.output_path, 'w')
            self.log_file.write( '[\n' )

        result = {}
        result['t'] = self.t
        result['num_of_visitors'] = self.num_of_visitors
        result['num_of_exits'] = 0

        for j in range(len(self.visitors)):
            if self.visitors[j].cs == self.exit.id:
                result['num_of_exits'] += 1

        result['num_of_active_visitors'] = 0

        result['a'] = []
        result['queue'] = []
        for i in range(len(self.attractions)):
            agents = [v.id for v in self.attractions[i].a]
            result['a'].append(agents)
            queue = [v.id for v in self.attractions[i].queue]
            result['queue'].append(queue)

        result['visitors'] = []
        for j in range(len(self.visitors)):
            visitor = {}
            visitor['id'] = self.visitors[j].id
            visitor['name'] = self.visitors[j].name
            visitor['a'] = self.visitors[j].current_a
            visitor['q'] = self.visitors[j].current_queue
            visitor['cs'] = self.visitors[j].cs
            visitor['wt'] = self.visitors[j].wt
            visitor['mt'] = self.visitors[j].mt
            #visitor['vt'] = self.visitors[j].vt
            visitor['is_exited'] = 1 if self.visitors[j].isExited else -1
            visitor['entering_t'] = self.visitors[j].entering_t
            visitor['exit_t'] = self.visitors[j].exit_t
            result['visitors'].append( visitor )

        if self.max_of_visitors == result['num_of_exits']:
            self.log_file.write( '    ' + json.dumps(result) + '\n]\n' )
            self.log_file.close()   # logfileを一旦クローズ

            # 最後の処理（一旦書き出したデータを再度読み込んできて、jsonの "result" に追加する）
            self.data['results'] = read_json(self.output_path)
            # それをJSONに書き出す
            write_json(self.output_path, self.data)

        else:
            self.log_file.write( '    ' + json.dumps(result) + ',\n' )



# ポアソン過程の乱数生成
def poisson_process(lam, range_max):
    y = math.exp(lam)    
    for n in range(range_max):
        y *= random.random()
        if y <= 1:
            return n
    return -1


# フィッシャー – イェーツのシャッフル
def shuffle(lst):
    i = len(lst) - 1
    while i > 0:    
        j = math.floor(random.random() * (i + 1))
        tmp = lst[i]
        lst[i] = lst[j]
        lst[j] = tmp
        i -= 1
    




# アトラクションのクラス
class Attraction:
    def __init__(self, id, name, type, capacity, service_time, themepark):
        self.themepark = themepark

        self.id = id
        self.name = name

        # テーマパーク問題関連パラメータ
        self.type = type
        self.c = capacity
        self.st = service_time
        self.vt = 0

        # 動的変数
        self.queue = []
        self.a = []

    def push_to_a(self, visitor):
        if self.themepark.debug:
            print('            ' + visitor.name + 'さんがアトラクション'+self.name+'に搭乗しました。')
        self.a.append(visitor)
        visitor.current_a = self.id

    def push_to_queue(self, visitor):
        if self.themepark.debug:
            print('            ' + visitor.name + 'さんがアトラクション'+self.name+'に並びました。')
        self.queue.append(visitor)
        visitor.current_queue = self.id

    # キューがビジターを待ち行列内に持つか?
    def queue_has(self, visitor):
        for i in range(len(self.queue)):
            if self.queue[i].id == visitor.id:
                return True
        return False

    def remove_from_queue(self, visitor):
        for i in range(len(self.queue)):
            if self.queue[i].id == visitor.id:
                visitor.current_queue = -1
                del self.queue[i]
                break
    
    def remove_from_a(self, visitor):
        for i in range(len(self.a)):
            if self.a[i].id == visitor.id:
                visitor.current_a = -1
                del self.a[i]
                break




# 客のクラス
class Visitor:
    def __init__(self, id, name, attr, themepark):
        self.themepark = themepark

        self.id = id
        self.name = name

        self.current_queue = -1
        self.current_a = -1

        # テーマパーク問題関連パラメータ
        self.entering_t = themepark.t
        self.exit_t = -1
        self.pt = 0   # 経過時間
        self.cs = themepark.entrance.id  # current state（エントランス）
        self.wt = 0   # 待ち時間
        self.mt = 0   # 移動時間

        self.isExited = False

        self.vt = [0 for _ in range(len(themepark.attractions))]  # 各アトラクションの滞在回数

        # ビジターの移動プラン（ゴールを含む）
        self.attr = attr
        self.attr.append(themepark.exit.id)
    
    def __str__(self):
        return self.name





if __name__ == '__main__':
    # パースした引数を取得
    args = get_option()

    # 第1引数に読み込みたいJSONファイルのパスを入れる
    file = open(args.input, 'r')
    data = json.load(file)

    # 第2引数に outputpath を入れる
    output_path = args.output

    # 第3引数に -debug モード
    debug = args.debug

    # シミュレーションスタート
    themepark = Themepark(data, output_path, debug)
    themepark.initial_process()
    themepark.start()


    #print(themepark.stats())
