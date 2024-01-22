/*
// 隣接行列
const adjoint_matrix_test = [
    [0, 0, 0, 0, 1, 0],
    [0, 0, 0, 0, 1, 0],
    [0, 0, 0, 0, 1, 0],
    [0, 0, 0, 0, 1, 0],
    [1, 1, 1, 1, 1, 1],
    [0, 0, 0, 0, 1, 0],
];
*/


const dijkstra_results = [];

// ダイクストラ法による計算
const dijkstra = (distance_matrix, s, g) => {
    for(let i=0; i<dijkstra_results.length; i++){
        if( dijkstra_results[i][0] == s && dijkstra_results[i][1] == g ){
            return dijkstra_results[i][2];
        }
    }

    const n = distance_matrix.length;  // num of nodes

    // 結果を保存する変数
    d = new Array(n);    // 暫定距離
    prev = new Array(n); // 1つ前のノード
    Q = [];    // 未訪問ノード

    // 変数の初期化
    for(let i=0; i<n; i++){
        if(i == s) { d[i] = 0; }
        else       { d[i] = Infinity; }
        Q.push(i);
    }

    // メインの処理
    while( Q.length > 0 ){
        // Qの中でd[u]が最小の要素uをとる
        let u = Q.reduce((u,v) => d[u]<d[v] ? u : v);
        // Qからuをremoveする
        Q.splice( Q.indexOf(u), 1 );

        // u からのエッジがある V のすべてのノード v 全体に対して以下を実行 
        for(let v=0; v<n; v++){
            if( distance_matrix[u][v] > 0 && (d[v] > d[u] + distance_matrix[u][v]) ){
                d[v] = d[u] + distance_matrix[u][v];
                prev[v] = u;
            }
        }
    }

    // sからすべてのノードへの最短パスを計算
    for(let i=0; i<n; i++){
        // 最短パス
        let shortest_path = [i];

        let g2 = i;
        while( g2 != s ){
            g2 = prev[g2];
            shortest_path.unshift(g2);  // 先頭から追加
        }

        // 結果を配列に追加
        dijkstra_results.push( [s, i, shortest_path] );
    }

    //console.log(dijkstra_results);

    return dijkstra(distance_matrix, s, g);
}

/*
console.log( dijkstra(adjoint_matrix_test, 0, 1) );
console.log( dijkstra(adjoint_matrix_test, 0, 2) );
console.log( dijkstra(adjoint_matrix_test, 0, 3) );
console.log( dijkstra(adjoint_matrix_test, 0, 4) );
console.log( dijkstra(adjoint_matrix_test, 0, 5) );
*/
