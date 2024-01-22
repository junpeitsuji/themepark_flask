window.onload = function(){


    const Attraction = class {
        constructor(id, name, x, y, dom_id, image_path, type, capacity, service_time){

            this.width  = parseInt( document.getElementById('width').value );
            this.height = parseInt( document.getElementById('height').value );


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
        
            // あとでDOMに追加する
            this.innerHTML = '<img id="'+dom_id+'" class="attraction" src="'+image_path+'"><p id="label-'+dom_id+'" class="attraction-label">'+'#'+id+' '+name + '<br><span class="label-detail">(st: '+this.st+', c: '+this.c+')</span></p>';
   
            // /*
            // DOMを追加
            const themepark = document.getElementById('themepark');
            themepark.insertAdjacentHTML('beforeend', this.innerHTML);

    
            this.dom = document.getElementById(dom_id);
            this.dom.style.left = x + 'px';
            this.dom.style.top  = y + 'px';
    
            const doml = document.getElementById('label-'+dom_id);
            doml.style.left = x + 'px';
            doml.style.top  = (y+this.height) + 'px';

            this.dom.style.width  = this.width + 'px';
            this.dom.style.height = this.height + 'px';

            // 暫定的に追加
            this.image_path = image_path;
            this.dom_id = dom_id;
        }
        
    }


    // 取得したデータからアトラクションの待ち行列を作成
    const attractions = [];

    // ノード間のリンクをまとめるためのリスト
    let links = [];
    
    // 取得したデータから隣接行列を設定（linksから作成）
    let adjoint_matrix = [];


    // mapを描く
    const drawmap = () => {

        //svg
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute("id", "svg");
        svg.setAttribute("width", "640");
        svg.setAttribute("height", "480");
        svg.setAttribute("viewbox", "0 0 640 480");
        
        for(let i=0; i<attractions.length; i++){
            for(let j=0; j<attractions.length; j++){
                if( (i != j) && (adjoint_matrix[i][j] == 1) ){

                    let ai = attractions[i];
                    let aj = attractions[j];

                    //line
                    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                    line.setAttribute('x1', ai.x + ai.width/2);
                    line.setAttribute('y1', ai.y + ai.height/2);
                    line.setAttribute('x2', aj.x + aj.width/2);
                    line.setAttribute('y2', aj.y + aj.height/2);
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


    let num_of_plazas = 0;
    let num_of_attractions = 0;
    let num_of_roads = 0;


    let current_id = -1;  // 選択されているID

    document.getElementById('themepark').addEventListener('click', function(event){

        const mode_select = document.getElementById('mode-select');
        const mode_index = mode_select.selectedIndex;
        const mode_type = mode_select.options[mode_index].value;


        const clickX = event.pageX ;
        const clickY = event.pageY ;

        // 要素の位置を取得
        const clientRect = this.getBoundingClientRect() ;
        const positionX = clientRect.left + window.pageXOffset ;
        const positionY = clientRect.top + window.pageYOffset ;

        // 要素内におけるクリック位置を計算
        const x = clickX - positionX ;
        const y = clickY - positionY ;

        console.log(x);
        console.log(y);

        if( mode_type == "mode-attractions" ){

            const select = document.getElementById('type-select');
            const index = select.selectedIndex;
            const attraction_type = select.options[index].value;
    
            let id = attractions.length;
            let dom_id = "entrance";
            let name = "Entrance";
    
            let image_path = "static/images/entrance.png";

            if( attraction_type == "type-entrance" ){
                document.getElementById('type-entrance').remove();
            }
            else if( attraction_type == "type-exit" ){
                name = "Exit";
                dom_id = "exit";
                image_path = "static/images/entrance.png";

                document.getElementById('type-exit').remove();
            }
            else if( attraction_type == "type-plaza" ){
                name = "Plaza "+num_of_plazas;
                dom_id = "plaza-"+num_of_plazas;
                image_path = "static/images/plaza.png";
                num_of_plazas++;
            }
            else if( attraction_type == "type-road" ){
                name = "Road "+num_of_roads;
                dom_id = "road-"+num_of_roads;
                image_path = "static/images/road.png";
                num_of_roads++;
            }
            else if( attraction_type == "type-attraction" ){
                name = "Attraction "+num_of_attractions;
                dom_id = "attr-"+num_of_attractions;
                image_path = "static/images/attraction"+(id%3)+".png";            
                num_of_attractions++;
            }
    
            // アトラクションを追加
            attractions.push(
                new Attraction(attractions.length, name, parseInt(x), parseInt(y), dom_id, image_path, attraction_type, Infinity, 1)
            );
            
            
        }
        else if( mode_type == "mode-links" ){
            const attr_width = parseInt( document.getElementById('width').value );
            const attr_height = parseInt( document.getElementById('height').value );

            // どのアトラクションか
            for(let k=0; k<attractions.length; k++){
                const a = attractions[k];

                if( (a.x <= x) && (x < a.x+attr_width)
                    && (a.y <= y) && (y < a.y+attr_height) ){
                    
                    if( current_id == -1 ){
                        current_id = k;
                        document.getElementById(a.dom_id).classList.add('selected');
                    }
                    else {
                        if( adjoint_matrix.length > 0 ){
                            document.getElementById('svg').remove();
                        }

                        links.push([current_id, k]);

                        console.log(links);

                        // 隣接行列を作る
                        adjoint_matrix = new Array(attractions.length);

                        for(let i=0; i<attractions.length; i++){
                            adjoint_matrix[i] = new Array(attractions.length);

                            for(let j=0; j<attractions.length; j++){
                                adjoint_matrix[i][j] = 0;

                                for(let link of links){
                                    if(i==link[0] && j==link[1]){
                                        adjoint_matrix[i][j] = 1;
                                    }
                                    if(i==link[1] && j==link[0]){
                                        adjoint_matrix[i][j] = 1;
                                    }
                                }
                            }
                        }

                        console.log(adjoint_matrix);


                        drawmap();

                        document.getElementById(attractions[current_id].dom_id).classList.remove('selected');

                        current_id = -1;

                    }
                    break;
                }
            }

        }

    });


    document.getElementById('generate').addEventListener('click', (e) => {
        
        let textarea = document.getElementById('result');

        let entrance_id = 0;
        let exit_id = 1;

        
        let attractions_hashdata = [];
        for(let i=0; i<attractions.length; i++){
            let a = attractions[i];

            if(a.type == "type-entrance"){
                entrance_id = a.id;
            }

            if(a.type == "type-exit"){
                exit_id = a.id;
            }

            let attraction_hash = {
                id: a.id,
                name: a.name,
                x: a.x,
                y: a.y,
                dom_id: a.dom_id,
                image_path: a.image_path,
                type: a.type,
                capacity: (a.c == Infinity) ? -1 : a.c,
                service_time: a.st,
            };

            attractions_hashdata.push(attraction_hash);
        }


        let result_data = {
            animation_steps: 200,
            visitors: {
                max_of_visitors: 20,
                num_of_initial_visitors: 0,
                plan_type: "random",
                image_path: "static/images/visitor.png",
                arrival: "poisson",
                arrival_rate: 0.3,
                width: 16,
                height: 24,        
            },
            themepark: {
                entrance_id: entrance_id,
                exit_id: exit_id,
                width: parseInt( document.getElementById('width').value ),
                height: parseInt( document.getElementById('height').value ),        
                attractions: attractions_hashdata,
                links: adjoint_matrix
            }
        };

        
        textarea.innerHTML = JSON.stringify(result_data, null , "\t");
    });

};
