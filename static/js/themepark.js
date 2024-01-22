// auto_mode() を外部から実行するために作った関数用の仮変数
let auto_mode_global;


// ポアソン過程の乱数生成
const poisson_process = (lambda, range_max) => {
    let y = Math.exp(lambda);
    
    for(let n=0; n<range_max; n++){
        y *= Math.random();
        if( y <= 1 ){
            return n;
        }
    }
    return -1;
}



/**
 * テーマパークシミュレーション
 */
const themepark = (data, replay_mode = false, reload_at_finished = false) => {
    // 時刻 t
    let t = 0;


    document.getElementById('themepark').innerHTML += '<p id="time">t = 0</p><p id="num-of-visitors">#Visitors = 0</p>';


    const Attraction = class {
        constructor(id, name, x, y, dom_id, image_path, type, capacity, service_time){
            this.id = id;
            this.name = name;
            this.x = x;
            this.y = y;
    
            // テーマパーク問題関連パラメータ
            this.type = type; 
            this.c = capacity;
            this.st = service_time;
            this.vt = 0;      // 人気のバロメータに使う？
    
            this.queue = [];  // 待ち行列
            this.a = [];      // サービス中のvisitor

            this.dom_id = dom_id;
            this.image_path = image_path;
    
            // あとでDOMに追加する
            this.innerHTML = '<img id="'+dom_id+'" class="attraction" src="'+image_path+'"><p id="label-'+dom_id+'" class="attraction-label">'+'#'+id+' '+name + '<br><span class="label-detail">(st: '+this.st+', c: '+this.c+')</span></p>';

            if( this.type == 'type-attraction' ){
                this.innerHTML += '<p id="count-'+dom_id+'" class="attraction-queue-count">0</p>';
            }
   
            // /*
            // DOMを追加
            const themepark = document.getElementById('themepark');
            themepark.insertAdjacentHTML('beforeend', this.innerHTML);

            this.dom = document.getElementById(dom_id);
            this.dom.style.left = x + 'px';
            this.dom.style.top  = y + 'px';
            this.dom.style.width = data.themepark.width + 'px';
            this.dom.style.height = data.themepark.height + 'px';
    
            const doml = document.getElementById('label-'+dom_id);
            doml.style.left = x + 'px';
            doml.style.top  = (y+data.themepark.height) + 'px';

            if( this.type == 'type-attraction' ){
                // 待ち行列長のカウントを表示
                const domc = document.getElementById('count-'+dom_id);
                domc.style.left = (x - data.visitors.width) + 'px';
                domc.style.top  = y + data.themepark.height - data.visitors.height - 12 + 'px';
                domc.style.width = data.visitors.width + 'px';
            }
            // */
        
        }
    
        push_to_a(visitor){
            console.log(visitor.name + 'さんがアトラクション'+this.name+'に搭乗しました。');        
    
            this.a.push(visitor);
            visitor.current_a = this.id;
        }
    
        push_to_queue(visitor){
            console.log(visitor.name + 'さんがアトラクション'+this.name+'に並びました。');        
    
            this.queue.push(visitor);
            visitor.current_queue = this.id;
        }
    
        // キューがビジターを待ち行列内に持つか?
        queue_has(visitor){
            for(let i=0; i<this.queue.length; i++){
                if( this.queue[i].id == visitor.id ){
                    return true;
                }
            }
            return false;
        }
    
        // キューからビジターを削除
        remove_from_queue(visitor){
            let remove_index = -1;

            for(let i=0; i<this.queue.length; i++){
                if( this.queue[i].id == visitor.id ){
                    remove_index = i;
                    break;
                }
            }
            
            if(remove_index != -1){
                this.queue.splice( remove_index, 1 );
                visitor.current_queue = -1;    
            }
        }
    
        // aからビジターを削除
        remove_from_a(visitor){
            let remove_index = -1;
            for(let i=0; i<this.a.length; i++){
                if( this.a[i].id == visitor.id ){
                    remove_index = i;
                    break;
                }
            }
    
            if(remove_index != -1){
                this.a.splice( remove_index, 1 );
                visitor.current_a = -1;
            }
        }
        
    }
    
    
    // 客のクラス
    const Visitor = class {
        constructor(id, name, attr, dom_id, image_path){
            this.id = id;
    
    
            this.name = name;   // お客の名前
    
            this.x = attractions[0].x + data.themepark.width/2 - data.visitors.width/2;
            this.y = attractions[0].y + data.themepark.height/2 - data.visitors.height/2;

            this.dom_id = dom_id;
    
            // DOM
            this.innerHTML = '<img id="'+dom_id+'" class="visitor" src="'+image_path+'" style="width: '+data.visitors.width + 'px'+'"; height: '+data.visitors.height + 'px'+'>';

            // あとでまとめてDOMに追加するようにリファクタリングしたい
            const themepark = document.getElementById('themepark');    
            themepark.insertAdjacentHTML('beforeend', this.innerHTML);
    
            // アニメーション用の目標位置
            this.target_x = this.x;
            this.target_y = this.y;
    
            this.current_queue = -1;
            this.current_a = -1;
    
    
            // テーマパーク問題関連パラメータ
            this.entering_t = t;
            this.exit_t = -1;
            this.pt = 0;  // 経過時間
            this.cs = entrance.id; // current state（エントランス）
            this.wt = 0;  // 待ち時間
            this.mt = 0;  // 移動時間

            this.isExited = false;
    
            this.vt = []; // 各アトラクションの滞在回数
            for(let i=0; i<attractions.length; i++){
                this.vt.push(0);
            }
    
            // ビジターの移動プラン（ゴールを含む）
            this.attr = attr;
            this.attr.push(exit.id);
    
        }
    
        // 座標を直接セットする関数
        moveTo(x, y){
            this.x = x;
            this.y = y;

            let distance_squared = (this.x - this.target_x) * (this.x - this.target_x)
            + (this.y - this.target_y) * (this.y - this.target_y);
    
            if( this.current_a == exit.id ){
                let ex = exit.x + data.themepark.width/2 - data.visitors.width/2;
                let ey = exit.y + data.themepark.height/2 - data.visitors.height/2;

                // 出口との距離
                let exit_distance_squared = (this.x - ex) * (this.x - ex)
                        + (this.y - ey) * (this.y - ey);
                        //console.log(exit_distance_squared);

                if( exit_distance_squared < 20 ){
                    // Exitでは距離が√2未満まで移動したらビジターを消す
                    if( !this.isExited ){
                        document.getElementById(this.dom_id).remove();
                        this.isExited = true;
                    }
                    //alert('exit');
                    return;
                }

            }
            
            if(distance_squared >= 1){
                const dom = document.getElementById(this.dom_id);
                dom.style.left = x + 'px';
                dom.style.top  = y + 'px';        
            }
            // 距離が0であればdomの更新は行わない
            
        }
    
        // 目標座標をセットして、アニメーションによってこの座標に向かわせる
        setTarget(x, y){
            this.target_x = x;
            this.target_y = y;
        }
    
        toString(){
            return this.name;
        }
    }    


    // 取得したデータからアトラクションの待ち行列を作成
    const attractions = [];
    for(let i=0; i<data.themepark.attractions.length; i++){

        let a = data.themepark.attractions[i];
        
        // キャパシティ -1 は Infinity
        let capacity = (a.capacity == -1) ? Infinity : a.capacity;

        attractions.push(
            new Attraction(a.id, a.name, a.x, a.y, a.dom_id, a.image_path, a.type, capacity, a.service_time)
        );
    }

    
    // 入口, 出口
    const entrance = attractions[data.themepark.entrance_id];
    const exit     = attractions[data.themepark.exit_id];


    // 取得したデータから隣接行列を設定
    const adjoint_matrix = data.themepark.links;



    // mapを描く
    const drawmap = () => {
        //svg
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute("width", "640");
        svg.setAttribute("height", "480");
        svg.setAttribute("viewbox", "0 0 640 480");
        
        for(let i=0; i<attractions.length; i++){
            for(let j=0; j<attractions.length; j++){
                if( (i != j) && (adjoint_matrix[i][j] == 1) ){

                    //line
                    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                    line.setAttribute('x1', attractions[i].x+data.themepark.width/2);
                    line.setAttribute('y1', attractions[i].y+data.themepark.height/2);
                    line.setAttribute('x2', attractions[j].x+data.themepark.width/2);
                    line.setAttribute('y2', attractions[j].y+data.themepark.height/2);
                    line.setAttribute('stroke', '#F2F2F2');
                    line.setAttribute('stroke-width', 16);
                    line.setAttribute('stroke-dasharray', "none");//10,10 etc
                    line.setAttribute('stroke-linejoin', 'miter'); //miter round bevel inherit
                    line.setAttribute('stroke-linecap', 'butt'); //butt round square inherit
                    line.setAttribute("opacity", 1);
                    line.setAttribute('fill-opacity', 1);
                    line.setAttribute('stroke-opacity', 1);
                    line.setAttribute('transform', "rotate(0)");
                    
                    //svgに追加
                    svg.appendChild( line );
                }
            }    
        }

        //要素にsvgを追加
        document.querySelector('#themepark').appendChild( svg );

    }

    drawmap();

    

    // visitorの定義
    const visitors = [];

    const max_of_visitors = data.visitors.max_of_visitors;
    const num_of_initial_visitors = data.visitors.num_of_initial_visitors;
    let num_of_visitors = 0;


    // visitorを追加するメソッド
    const add_new_visitor = () => {

        // プラン（アトラクションのリスト）
        let plan = [];
        for(let i=0; i<attractions.length; i++){
            if(attractions[i].type == 'type-attraction'){
                plan.push(i);
            }
        }
        

        if( data.visitors.plan_type == "random" || data.visitors.plan_type == "random-4" ){
            console.log('Visitor plan: random');

            // フィッシャー – イェーツのシャッフル
            for(let i = plan.length - 1; i > 0; i--) {
                let j = Math.floor(Math.random() * (i + 1));
                let tmp = plan[i];
                plan[i] = plan[j];
                plan[j] = tmp;
            }
        }
        else if( data.visitors.plan_type == "ordered" ){
            // 順序通り(1->2->3->...)
            console.log('Visitor plan: ordered');
        }
        else if( data.visitors.plan_type == "manual" ){
            // "plan_manual" で指定した通りのプラン
            console.log('Visitor plan: manual');
            plan = new Array(data.visitors.plan_manual[num_of_visitors].length);
            for(let i=0; i<data.visitors.plan_manual[num_of_visitors].length; i++){
                plan[i] = data.visitors.plan_manual[num_of_visitors][i];
            }
        }
        
        if( data.visitors.plan_type == "random-4" ){
            while( plan.length > 4 ){
                plan.pop();
            }
        }
        
        
        // ビジターを作成
        const new_visitor = new Visitor(num_of_visitors, '#'+num_of_visitors, plan, 'visitor-'+num_of_visitors, data.visitors.image_path);

        // visitorsに追加
        visitors.push( new_visitor );

        // エントランスに集合
        entrance.push_to_a( new_visitor );

        num_of_visitors++;
    };
    

    for(let j=0; j<num_of_initial_visitors; j++){
        add_new_visitor();
    }



    /**
     * 次のアトラクションへの移動
     */ 
    const next_navigation = (j) => {
        let visitor = visitors[j];

        // すでに滞在したアトラクションについては候補から除く
        while( visitor.vt[ visitor.attr[0] ] > 0 ){
            visitor.attr.shift();  // 先頭を除く
        }

        // 次の目的アトラクション
        let next_target = visitor.attr[0];

        // 現在の状態csから次の目的アトラクションまでの最短経路
        let shortest_path = dijkstra(adjoint_matrix, visitor.cs, next_target);
        
        // 次に行くべきSegmentを出力
        return shortest_path[1];
    }




    // 条件2, 3の判定
    const condition = (j, k) => {

        if( ((attractions[k].a.length + 1) <= attractions[k].c) 
            && (attractions[k].queue.length == 0) ){
            // アトラクション k にキャパシティがあり、かつ、k の待ち行列が空である場合
            return true;
        }

        if( ((attractions[k].a.length + 1) <= attractions[k].c) 
            && (attractions[k].queue.length != 0) ) {

            // アトラクション k にキャパシティがあり、かつ、
            // エージェント j が k の先頭から min((c_k - a_k), |q_k|) 人以内に並んでいる場合

            let minimum = Math.min(attractions[k].c - attractions[k].a.length,  attractions[k].queue.length);
            for(let i=0; i<minimum; i++){
                if( attractions[k].queue[i].id == j ){
                    return true;
                }
            }
        }
        
        return false;
    }




    const realTimeChartLabels = []; // グラフデータ（描画するデータ）
    const realTimeNumOfVisitors = [];
    const realTimeNumOfExits = [];
    const realTimeNumOfActives = [];

    /**
     * リアルタイムチャート
     */
    const real_time_update = () => {
        let time_steps = parseInt(t / 40);
        if( !(time_steps == 0 || t % time_steps == 0) ){
            return ;
        }

        // すでにグラフ（インスタンス）が生成されている場合は、グラフを破棄する
        if (typeof myRealTimeChart !== 'undefined' && myRealTimeChart) {
            console.log(myRealTimeChart);
            myRealTimeChart.destroy();
        }


        var ctx = document.getElementById('real-time-chart').getContext('2d');
        window.myRealTimeChart = new Chart(ctx, { // インスタンスをグローバル変数で生成
            type: 'line',
            data: { // ラベルとデータセット
                labels: realTimeChartLabels,
                datasets: [{
                    label: '#Visitors',
                    data: realTimeNumOfVisitors, // グラフデータ
                    fill: false,
                    borderColor: 'rgba(255, 99, 132, 1)',
                    borderWidth: 2, // 枠線の太さ
                    pointStyle: 'line',
                    //tension: 0.1,
                    cubicInterpolationMode: 'monotone',
                }, 
                {
                    label: '#Exits',
                    data: realTimeNumOfExits, // グラフデータ
                    fill: false,
                    borderColor: 'rgba(54, 162, 235, 1)',
                    borderWidth: 2, // 枠線の太さ
                    pointStyle: 'line',
                    //tension: 0.1,
                    cubicInterpolationMode: 'monotone',
                },
                {
                    label: '#ActiveVisitors',
                    data: realTimeNumOfActives, // グラフデータ
                    fill: false,
                    borderColor: 'rgba(255, 206, 86, 1)',
                    borderWidth: 2, // 枠線の太さ
                    pointStyle: 'line',
                    //tension: 0.1,
                    cubicInterpolationMode: 'monotone',                    
                }],
            },
            options: {
                scales: {
                    yAxes: [           // Ｙ軸 
                        {
                            ticks: {     // 目盛り        
                                min: 0,      // 最小値
                                  // beginAtZero: true でも同じ
                                max: max_of_visitors,     // 最大値
                                //stepSize: 5  // 間隔
                            }
                        }
                    ]
                },
                /*
                legend: {
                    display: false, // 凡例を非表示
                },*/
                animation: false
            }
        });
    }


    // 可視化用のデータ
    const congestion = [];


    /**
     * データの可視化
     */
    const display_status = () => {
        console.log('=========================');
        console.log('t = ' + t);

        document.getElementById('time').innerHTML = 't = '+t;
        document.getElementById('num-of-visitors').innerHTML = '#Visitors = '+visitors.length;

        // attraction情報の表示
        for(let i=0; i<attractions.length; i++){
            console.log(attractions[i].name + ': [' + attractions[i].a.join(', ') + '], [' + attractions[i].queue.join(', ') + ']');
        }


        // visitor情報の表示
        for(let j=0; j<visitors.length; j++){
            //let total_time = visitors[j].exit_t - visitors[j].entering_t;
            let wt = visitors[j].wt;
            let mt = visitors[j].mt;
            let st = t - visitors[j].entering_t - wt - mt;

            if( visitors[j].exit_t >= 0 ){
                st =  visitors[j].exit_t - visitors[j].entering_t - wt - mt;
            }

            console.log(visitors[j].name + ': attr: [' + visitors[j].attr.join(',') + '], cs: '+visitors[j].cs + ', vt: [' + visitors[j].vt.join(',') + '], wt: '+wt + ', mt: ' + mt + ', st: ' + st + ', enter_t: ' + visitors[j].entering_t + ', exit_t: ' + visitors[j].exit_t);
        }

        /*
        // 待ち行列長グラフ描画の準備
        const labels = [];
        const current_congestion = [];
        for(let i=0; i<attractions.length; i++){
            const attr = attractions[i];

            // アトラクションだけ
            if(attr.type == "type-attraction"){
                labels.push( attr.name );
                current_congestion.push( attr.queue.length );
            }
        }
        congestion.push( current_congestion );


        // カラーマップの定義
        const colors = [];
        for(let i=0; i<max_of_visitors; i++){
            let val = 255 - i*255/max_of_visitors;
            colors.push('rgb('+val+','+val+','+val+')');
        }

        const label_width = 60;

        // グラフ化
        array_chart('chart', congestion, max_of_visitors, colors, labels, label_width);
        */

        // リアルタイムグラフを書く
        //let time_steps = parseInt(t / 40);
        let time_steps = 10;
        if(t % time_steps == 0){

            // exitした人数
            let num_of_exits = 0;

            for(let j=0; j<visitors.length; j++){
                if( visitors[j].cs == exit.id ){
                    if( visitors[j].exit_t < 0 ){
                        visitors[j].exit_t = t;
                    }
                    num_of_exits++;
                }
            }
        
            realTimeChartLabels.push(t);
            //realTimeChartLabels.push('');

            realTimeNumOfVisitors.push(num_of_visitors);
            realTimeNumOfExits.push(num_of_exits);
            realTimeNumOfActives.push(num_of_visitors - num_of_exits);
            real_time_update();
        }

    }



    // 描画のために待ち行列の並び具合に合わせて、目標座標を設定し直す
    const setVisitorsPosition = () => {
        let visitor_width = data.visitors.width;
        let visitor_height = data.visitors.height;
        
        let mitsu_ratio = 0.5;

        for(let j=0; j<visitors.length; j++){
            const visitor = visitors[j];

            if( visitor.current_queue != -1 ){
                // visitor が並んでいるキューがある
                let attr = attractions[visitor.current_queue];

                let current_queue_index = 0;  // 何番目に並んでいるか
                for(let k=0; k<attr.queue.length; k++){
                    if( attr.queue[k].id == visitor.id ){
                        break;
                    }
                    current_queue_index++;
                }

                //visitor.setTarget(attr.x - visitor_width - mitsu_ratio*visitor_width*current_queue_index, attr.y + data.themepark.height - visitor_height);

                visitor.setTarget(attr.x - visitor_width, attr.y + data.themepark.height - visitor_height);
                
                continue;
            }
            else if( visitor.current_a != -1 ){
                // visitor が搭乗しているアトラクションがある
                let attr = attractions[visitor.current_a];

                if( visitor.current_a == exit.id ){
                    // 出口のときだけは目標地点をアトラクションの正規の座標にする
                    visitor.setTarget(attr.x + data.themepark.width/2 - visitor_width/2, attr.y + data.themepark.height/2 - visitor_height/2);
                    continue;
                }


                let current_a_index = 0;  // 何番目に並んでいるか
                for(let k=0; k<attr.a.length; k++){
                    if( attr.a[k].id == visitor.id ){
                        break;
                    }
                    current_a_index++;
                }

                visitor.setTarget(attr.x + mitsu_ratio*(attr.a.length-1)*visitor_width/2 + data.themepark.width/2 - visitor_width/2 - mitsu_ratio*visitor_width*current_a_index, attr.y + data.themepark.height/2 - visitor_height/2);
            }
        }    

        for(let i=0; i<attractions.length; i++){
            let a = attractions[i]; 

            if( a.type == 'type-attraction' ){
                document.getElementById('count-'+a.dom_id).innerHTML = a.queue.length+'';
            }

        }
    }


    /**
     * 移動時間の分布を積み上げ棒グラフで紹介
     */
    const draw_barchart = () => {
        var ctx = document.getElementById("myChart");

        // グラフ用の情報
        const chart_wt = [];
        const chart_mt = [];
        const chart_st = [];

        const data_labels = [];

        // visitor情報
        for(let j=0; j<visitors.length; j++){
            data_labels.push( visitors[j].name );

            let wt = visitors[j].wt;
            let mt = visitors[j].mt;
            let st = t - visitors[j].entering_t - wt - mt;

            if( visitors[j].exit_t >= 0 ){
                st =  visitors[j].exit_t - visitors[j].entering_t - wt - mt;
            }

            chart_wt.push( wt );
            chart_mt.push( mt );
            chart_st.push( st );
        }


        const data_array = [{
            label: "waiting time",
            borderWidth:1,
            backgroundColor: 'rgba(255, 99, 132, 0.2)',
            borderColor: 'rgba(255, 99, 132, 1)',
            data: chart_wt
        },
         {
            label: "moving time",
            borderWidth:1,
            backgroundColor: 'rgba(54, 162, 235, 0.2)',
            borderColor: 'rgba(54, 162, 235, 1)',
            data: chart_mt
        },{
            label: "service time",
            borderWidth:1,
            backgroundColor: 'rgba(255, 206, 86, 0.2)',
            borderColor: 'rgba(255, 206, 86, 1)',
            data: chart_st
        }];



        var myChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: data_labels,
                datasets: data_array
      
            },
            options: {
                title: {
                    display: true,
                    text: 'Breakdown of visiting time', //グラフの見出し
                    padding:3
                },
                scales: {
                    xAxes: [{
                          stacked: true, //積み上げ棒グラフにする設定
                          categoryPercentage:0.4 //棒グラフの太さ
                    }],
                    yAxes: [{
                          stacked: true //積み上げ棒グラフにする設定
                    }]
                },
                legend: {
                    labels: {
                          boxWidth:30,
                          padding:20 //凡例の各要素間の距離
                    },
                    display: true
                },
                tooltips:{
                  mode:'label' //マウスオーバー時に表示されるtooltip
                }
            }
        });
    }



    
    /**
     * シミュレーションを実行する関数
     */ 
    const agent_activity = () => {
        //alert('simulation mode');

        if(num_of_visitors < max_of_visitors){

            if(data.visitors.arrival == "poisson"){
                // ポアソン過程にしたがってvisitorを追加
                const num = Math.min(poisson_process(data.visitors.arrival_rate, max_of_visitors), max_of_visitors-num_of_visitors);
                
                for(let j=0; j<num; j++){
                    add_new_visitor();
                }

            }
            else if(data.visitors.arrival == "random"){
                let rand = Math.random();
                if(rand < data.visitors.arrival_rate){
                    add_new_visitor();
                }
    
            }

        }


        

        for(let j=0; j<num_of_visitors; j++){
            // エージェント j に対して以下を実行

            if( visitors[j].cs == exit.id ){
                // 既にゴールしたエージェントは処理が終了
                continue;
            }


            visitors[j].pt = visitors[j].pt + 1;
            let i = visitors[j].cs;


            if( attractions[i].st <= visitors[j].pt ){
                let k = next_navigation(j);

                if( condition(j, k) ){
                    visitors[j].wt = visitors[j].wt + visitors[j].pt - attractions[i].st;

                    // road or plazaの処理
                    if( attractions[i].type == 'type-road' || attractions[i].type == 'type-plaza' ){
                        visitors[j].mt = visitors[j].mt + attractions[i].st;
                    }

                    visitors[j].cs = k;
                    visitors[j].pt = 0;
                    attractions[k].vt++;  //（今回は入れない）
                    visitors[j].vt[k]++;  // アトラクション k に滞在した回数を増やす

                    // a_i から j を削除
                    attractions[i].remove_from_a(visitors[j]);
                    // q_k から j を削除
                    attractions[k].remove_from_queue(visitors[j]);

                    // add agent j to a_k 
                    attractions[k].push_to_a(visitors[j]);

                }
                else if( !( attractions[k].queue_has(visitors[j]) ) ){
                    attractions[k].push_to_queue(visitors[j]);

                    // a_i から j を削除
                    attractions[i].remove_from_a(visitors[j]);   // 追加してみた
                    // DISCUSSION: アトラクションa_iのサービスが終わったのに「次のアトラクションa_kが空かない」という理由で、q_kに並びつつa_iに居座っているビジターjがいて、そのせいでq_iにいるビジターがサービスを受けられないという問題があった。なので、jはq_kに並んだ段階でa_iから除かなければならない
                    // 川村先生の論文のバグ

                }
            }

        }


        // 描画のために待ち行列の並び具合に合わせて、目標座標を設定し直す
        setVisitorsPosition();


        // exitした人数
        let num_of_exits = 0;

        for(let j=0; j<visitors.length; j++){
            if( visitors[j].cs == exit.id ){
                if( visitors[j].exit_t < 0 ){
                    visitors[j].exit_t = t;
                }
                num_of_exits++;
            }
        }
        
        if( num_of_exits < max_of_visitors ){
            // 現在の状態を表示
            display_status();
            t++;

            return true;
        }
        else {
            display_status();

            // 終了後にバーチャートを表示する
            draw_barchart();

            console.log('all exits');

            
            // 終了したらリロードする
            if(reload_at_finished == true){
                setTimeout(function(){
                    location.reload();
                }, 10000);
            }

            return false;
        }
    
    }


    /**
     * リプレイ再生用のagent_activity
     * @returns 
     */
    const agent_activity_with_replay = () => {
        //alert('replay mode');

        const current_results = data.results[t];   // 現在の t における実験結果

        const num_of_prev_visitors = num_of_visitors;

        for(let j=0; j<current_results.num_of_visitors; j++){

            if( j < num_of_prev_visitors ){
                visitors[j].cs = current_results.visitors[j].cs
                visitors[j].wt = current_results.visitors[j].wt
                visitors[j].mt = current_results.visitors[j].mt
                //visitors[j].vt = current_results.visitors[j].vt
                visitors[j].entering_t = current_results.visitors[j].entering_t
                visitors[j].exit_t = current_results.visitors[j].exit_t


                if(current_results.visitors[j].q != -1){
                    // 移動していたら k に並ばせる
                    let k = current_results.visitors[j].q;
                    if( visitors[j].current_queue != k ){

                        if( visitors[j].current_queue != -1 ){
                            let i = visitors[j].current_queue;
                            attractions[i].remove_from_queue( visitors[j] );
                        }
                        if( visitors[j].current_a != -1 ){
                            let i = visitors[j].current_a;
                            attractions[i].remove_from_a( visitors[j] );
                        }
                        attractions[k].push_to_queue( visitors[j] );
                    }

                }
                else if(current_results.visitors[j].a != -1){
                    // 移動していたら k に搭乗させる
                    let k = current_results.visitors[j].a;
                    if( visitors[j].current_a != k ){

                        if( visitors[j].current_queue != -1 ){
                            let i = visitors[j].current_queue;
                            attractions[i].remove_from_queue( visitors[j] );
                        }
                        if( visitors[j].current_a != -1 ){
                            let i = visitors[j].current_a;
                            attractions[i].remove_from_a( visitors[j] );
                        }
                        attractions[k].push_to_a( visitors[j] );
                    }
                }
            }
            else {
                // ビジターが増えたので追加
                let v = current_results.visitors[j]
                add_new_visitor();

            } 
        }


        // 描画のために待ち行列の並び具合に合わせて、目標座標を設定し直す
        setVisitorsPosition();



        // exitした人数
        let num_of_exits = 0;

        for(let j=0; j<visitors.length; j++){
            if( visitors[j].cs == exit.id ){
                if( visitors[j].exit_t < 0 ){
                    visitors[j].exit_t = t;
                }
                num_of_exits++;
            }
        }
        
        if( num_of_exits < max_of_visitors ){
            // 現在の状態を表示
            display_status();
            t++;

            return true;
        }
        else {
            display_status();

            // 終了後にバーチャートを表示する
            draw_barchart();

            console.log('all exits');
            return false;
        }
    
    }


    /**
     * UI 系の処理
     */
    if(replay_mode){
        document.getElementById('next').addEventListener('click', agent_activity_with_replay);

    }
    else {
        document.getElementById('next').addEventListener('click', agent_activity);
    }


    const auto_mode = () => {
        let flag = false;
        if(replay_mode ){
            flag = agent_activity_with_replay();
        }
        else{
            flag = agent_activity();
        }

        if( flag ){
            setTimeout(auto_mode, data.animation_steps);
        }
    };


    // auto modeをスタートさせる
    document.getElementById('auto').addEventListener('click', ()=>{

        document.getElementById('next').setAttribute("disabled", true);
        document.getElementById('auto').setAttribute("disabled", true);

        auto_mode();

    });



    const animation_update = () => {
        // 目標地点の座標にだんだん近づくような処理

        for(let j=0; j<num_of_visitors; j++){
            const v = visitors[j];

            const x = v.x + 0.15 * (v.target_x - v.x);
            const y = v.y + 0.15 * (v.target_y - v.y);

            v.moveTo(x, y);    

        }
        window.requestAnimationFrame(animation_update);
    };

    window.requestAnimationFrame(animation_update);

    auto_mode_global = auto_mode; 
    
};
