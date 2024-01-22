const array_chart = (id, data_array, value_max, color, labels, label_width) => {
    const canvas = document.getElementById(id);

    const width = canvas.width;
    const height = canvas.height;

    const context = canvas.getContext('2d');
    //canvas.style.width = width+'px';
    //canvas.style.height = height+'px';


    context.fillStyle = "rgb(255, 255, 255)";
    context.fillRect(0, 0, width, height);

    const n = data_array.length;     // 横方向
    const m = data_array[0].length;  // 縦方向

    const dot_width = (width-label_width) / n;
    const dot_height = height / m;


    // 線を引く
    context.beginPath () ;
    context.moveTo( label_width, 0 ) ;
    context.lineTo( label_width, height )
    context.strokeStyle = "black" ;
    context.lineWidth = 1;
    context.stroke() ;


    for(let j=0; j<m; j++){
        let y = j*dot_height;

        context.fillStyle = 'black';
        context.font = "10px serif";
        context.fillText(labels[j], 0, y+dot_height/2);

        for(let i=0; i<n; i++){        
            let x = i*dot_width + label_width;
            
            let color_value = color[ Math.floor( data_array[i][j] * (color.length-1) / value_max ) ];
            context.fillStyle = color_value;
            context.fillRect(x, y, dot_width, dot_height);

        }
    }
}

/*
console.log('test');

array_chart('chart', [
    [1, 0, 0],
    [0, 1, 0],
    [0, 0, 1],
    [0, 1, 0],
    [0, 0, 1],
], 1, ['white', 'red'], 640, 120);
*/
