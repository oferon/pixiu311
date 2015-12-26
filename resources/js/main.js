/* Change log
 2015-02-21
 - Daniel F. Added action_codes variable (object) storing all the user actions codes by name and value. 
 Do not use values 0 for action codes
 
 */

var     f_start_time = null,
        game,
        splash_txt,
        car,
        s_bg_street,
        s_bg_mountain,
        dialog1_done = false,
        dialog2_done = false,
        score1,
        score2,
        shuttle_feedback = [0, 0, 0],
        show_feedback = false,
        action_codes = {coin_collect: 1000, shuttle_choice_detour: 2000, shuttle_choice_ride: 3000},
rnd,
        new_junction = false,
        isGamePaused = false,
        overide = false,
        feedbacks,
        feedbacks_num,
        frameid,
        //PIXI.js renderer
        renderer,
        canvas,
        pixi_stage,
        width,
        height,
        bird_offset = 0,
        hit = 100,
        coin_count = 0,
        shuttleChoice = false,
        shuttle_delay = 0,
        shuttle_wait = 200, //0*Math.random(),
        shuttle_speed = 0.05 + Math.random(),
        performance_mem,
        delays = false,
        shuttle_retract = 0,
        shuttle_forward = 0,
        detourChoice = false,
        x_offset = 0,
        second_x_offset = 0,
        y_offset = 0,
        second_y_offset = 0,
        stage = 1,
        trial_time = 0,
// version 2
        shuttle_speed_low = 1,
        shuttle_speed_med = 2.5,
        shuttle_speed_high = 4,
        shuttle_wait_long = 700,
        shuttle_wait_med = 250,
        shuttle_wait_short = 20,
// version 1
        /*
         shuttle_speed_low=0.3, 
         shuttle_speed_med=0.8,
         shuttle_speed_high=2,
         shuttle_wait_long=1300,
         shuttle_wait_med=500,
         shuttle_wait_short=100,
         */
        ind = 1, // index to shuttle choices (first, second, etc.)
        every_other_pop = 2,
        first_pop = true,
        session = ServerStateVars.session,
        popup = ServerStateVars.popup,
        /* these are the state variables of the car around the lake: */
        junction_before_choice = false, // during this time the car will go to the junction
        junction_choice = false, // during this time the car waits at the junction
        junction_shuttle_positioning = false, // durign this time the car position itself on the dock after shuttle choice
        junction_wait_for_shuttle = false, // during this stage the care waits for the shuttle at the dock
        junction_taking_detour1 = false, // the car takes the detour 1. down the lake
        junction_taking_detour2 = false, // the car takes the detour 2. starit on bottom of lake
        junction_taking_detour3 = false, // the car takes the detour 3. up the lake towards the end


// plot dynamically "shuttle ride cost 4 coints
        FeedbackChart = {
            x: 0,
            y: 0,
            img: new Image(),
            src_url: "./u311/carexperiment/resources/images/game/feedbackchart.png",
            init: function ()
            {
                this.img.onload = function ()
                {
                    console.log("Chart loaded");
                };

                this.reload();
            },
            draw: function (ctx)
            {
                console.log("Drawing chart");
                ctx.drawImage(this.img, 130, 280);
            },
            reload: function ()
            {
                console.log("Loading new image");
                this.img.src = this.src_url;
            }
        },
scrollTextPos = 0,
        fgpos = 0,
        frames = 0,
        score = ServerStateVars.score,
        best = localStorage.getItem("best") || 0,
        currentstate,
        states = {Splash: 0, Game: 1, Score: 2, Junction: 3},
okbtn, //Ok button initiated in main()
        sharebtn, //Share button initiated in main()
        shuttlebtn,
        detourbtn,
        bird = {// the car...
            velocity: 0,
            _jump: 4.6,
            gravity: 0.25,
           radius: 12,
            s_car: null,
            /* Init the car object */
            init: function ()
            {
                console.log("Initializing car...");
                          
                var _t_car = [];

                var car_frames = ["car0","car1","car2"];
                
       

                //Go through all the frames and load them into textures
                for (i = 0; i < car_frames.length; i++){
                    var texture = PIXI.Texture.fromFrame(car_frames[i]);
                    _t_car.push(texture);
                }

                //Create a movie clip and set initial parameters
                this.s_car = new PIXI.extras.MovieClip(_t_car);
                this.s_car.position.set(60,0);
                this.s_car.anchor.set(0.5);
                this.s_car.animationSpeed = .5;
                this.s_car.play();
                
            },
            /**
             * Makes the car "flap" and jump
             */
            jump: function () {
                this.velocity = -this._jump;
            },
            /**
             * Update sprite animation and position of car
             */
            update: function () {
                // make sure animation updates and plays faster in gamestate
                var n = currentstate === states.Splash ? .4 : .2;
                this.s_car.animationSpeed = n;

                // in splash state make car hover up and down and set rotation to zero
                if (currentstate === states.Splash) {
                    this.s_car.y = height - 280 + 5 * Math.cos(frames / 10);
                    this.s_car.rotation = 0;
                } else if (currentstate === states.Junction) {
                    this.s_car.y = bird_offset + height - 180 + 5 * Math.cos(frames / 10);
                    this.s_car.rotation = 0;
                    this.s_car.x = 75;//135;
                }
                else { // game and score state

                    this.velocity += this.gravity;
                    this.s_car.y += this.velocity;

                    
                    //Car pivot is set around center of the sprite    
                    if (this.s_car.y >= s_bg_street.y - this.s_car.height/2 ) {
                        this.s_car.y = s_bg_street.y - this.s_car.height/2;
                        this.velocity = 0;
                    }

                    // when car lack upward momentum increment the rotation angle

                    if (this.velocity == 0)
                        this.s_car.rotation = 0;
                    else if (this.velocity > 0)
                        this.s_car.rotation = 0.4;
                    else if (this.velocity < 0)
                        this.s_car.rotation = -0.4;

                }
            }
        },
/*
 * Coin class
 */
coins = {
    _coins: [],
    reset: function ()
    {
        this._coins = [];
    },
    update: function ()
    {
        // Add a new coin every 100 frames
        if (frames % 100 === 0) {
            var _y = height - (s_coin.height + s_bg_street.height + 120 + 200 * Math.random());

            this._coins.push({
                x: 500,
                y: _y,
                w: s_coin.width,
                h: s_coin.height
            });
        }


        for (var i = 0, len = this._coins.length; i < len; i++) {
            var c = this._coins[i];

            //Collision detection
            if (c.x < bird.x + bird.w &&
                    c.x + c.w > bird.x &&
                    c.y < bird.y + bird.h &&
                    c.h + c.y > bird.y) {

                c.x = 10000;

                score++;
                coin_count++;
                //Send coin collection message to the server
                Report_user_action(action_codes['coin_collect'], stage - 1);
            }



            c.x -= 2;
            if (c.x < -c.w) {
                this._coins.splice(i, 1);
                i--;
                len--;
                //console.log("Coin removed");
            }
        }
    },
    draw: function (ctx) {

        for (var i = 0, len = this._coins.length; i < len; i++) {
            var c = this._coins[i];
            s_coin.draw(ctx, c.x, c.y);
        }
    }
},
backgroundFx = {
    setBGGradient: function (hour, minute) {      // create linear gradient based upon time of day
        var grd = ctx.createLinearGradient(0, canvas.width / 2, 0, canvas.width);
        grd.addColorStop(0, '#2d91c2');
        grd.addColorStop(1, '#1e528e');
        ctx.fillStyle = grd;
        ctx.fill();
    },
    update: function () {
        if (frames % 60 === 0) {
            var date = new Date;
//var seconds = date.getSeconds();
//var minutes = date.getMinutes();
            var hour = date.getHours();
//var hour = Math.ceil(date.getSeconds()/2.5);  //for debug
//if (hour == 24) hour = 0;
//console.log(hour)
            this.setBGGradient(hour);
        }
    }
},
game_env = {
    screen_w: null,
    screen_h: null
};


function reset_game_vars() {

    bird_offset = 0;
    hit = 100;
    shuttleChoice = false;
    shuttle_delay = 0;
    shuttle_wait = 200; //0*Math.random(),
//shuttle_speed=0.05+Math.random();
    delays = false;
    shuttle_retract = 0;
    shuttle_forward = 0;
    detourChoice = false;
    x_offset = 0;
    second_x_offset = 0;
    y_offset = 0;
    second_y_offset = 0;
    stage = 1;
    scrollTextPos = 0;
    fgpos = 0;
    frames = 0;
    best = localStorage.getItem("best") || 0;

}

function ontouch(e)
{
    e.preventDefault();
    console.log("Touch event");

    var touches = e.changedTouches;

    if (touches.length > 0)
    {
        var touch = touches[0];

        var posx = 0;
        var posy = 0;

        if (touch.pageX || touch.pageY) {
            posx = touch.pageX;
            posy = touch.pageY;
        }
        else if (touch.clientX || touch.clientY) {
            posx = touch.clientX + document.body.scrollLeft + document.documentElement.scrollLeft;
            posy = touch.clientY + document.body.scrollTop + document.documentElement.scrollTop;
        }

        var rect = canvas.getBoundingClientRect();
        var x = rect.left + document.body.scrollLeft + document.documentElement.scrollLeft;
        var y = rect.top + document.body.scrollTop + document.documentElement.scrollTop;

        mx = posx - x;
        my = posy - y;

        onpress(mx, my);
    }
}

function onmouse(e)
{

    e.preventDefault();

    var posx = 0;
    var posy = 0;
    if (!e) {
        var e = window.event;
    }
    if (e.pageX || e.pageY) {
        posx = e.pageX;
        posy = e.pageY;
    }
    else if (e.clientX || e.clientY) {
        posx = e.clientX + document.body.scrollLeft + document.documentElement.scrollLeft;
        posy = e.clientY + document.body.scrollTop + document.documentElement.scrollTop;
    }

    var rect = canvas.getBoundingClientRect();
    var x = rect.left + document.body.scrollLeft + document.documentElement.scrollLeft;
    var y = rect.top + document.body.scrollTop + document.documentElement.scrollTop;

    mx = posx - x;
    my = posy - y;

    onpress(mx, my);
}

/**
 * Called on mouse or touch press. Update and change state
 * depending on current game state.
 *
 * @param  {MouseEvent/TouchEvent} evt tho on press event
 */
function onpress(mx, my) {
//document.getElementById("consoleMe").innerHTML = evt.type;

    switch (currentstate) {

        // change state and update car velocity
        case states.Splash:
            currentstate = states.Game;
            bird.jump();
            break;

        case states.Junction:

            if (shuttlebtn.x < mx && mx < shuttlebtn.x + shuttlebtn.width && shuttlebtn.y < my && my < shuttlebtn.y + shuttlebtn.height) {
                //location.hash='share'
                if (junction_choice) {
                    if (score > 3)
                        score = score - 4;
                    else
                        return;
                    Report_user_action(action_codes['shuttle_choice_ride'], stage - 1);
                    set_shuttle_performance();
                    shuttleChoice = true;
                    detourChoice = false;
                    junction_choice = false;
                    junction_shuttle_positioning = true;
                }
            }
            // comment from here for bias version
            if (detourbtn.x < mx && mx < detourbtn.x + detourbtn.width && detourbtn.y < my && my < detourbtn.y + detourbtn.height) {
                if (junction_choice) {
                    Report_user_action(action_codes['shuttle_choice_detour'], stage - 1);
                    detourChoice = true;
                    shuttleChoice = false;
                    junction_choice = false;
                    junction_taking_detour1 = true;
                }

            }
            // uncomment for bias
            break;

            // update car velocity
        case states.Game:
            bird.jump();
            break;

            // change state if event within okbtn bounding box
        case states.Score:


            coins.reset();
            currentstate = states.Splash;
            break;

    }

}

/**
 * Starts and initiate the game
 */
function main() {

    game = new Game();
    

    window.addEventListener("resize", resizeWindow);
    window.addEventListener("keydown", game.inputcomp.handleKeyDown.bind(game.inputcomp));
    window.addEventListener("keyup", game.inputcomp.handleKeyUp.bind(game.inputcomp));
    
    width = game.pref_width;
    height = game.pref_height;

    document.body.appendChild(game.pixi_renderer.view);

    PIXI.loader
    .add('./u311/carexperiment/resources/images/sprites/car.json')
    .add('road_light_forest','./u311/carexperiment/resources/images/sprites/road_light_forest.png')
    .add('car_blue','./u311/carexperiment/resources/images/sprites/car_blue.png')
    .add('junction_road','./u311/carexperiment/resources/images/sprites/shuttle_ride_bg.png')
    .add('detour_road','./u311/carexperiment/resources/images/sprites/lake_road.png')
    .add('coin','./u311/carexperiment/resources/images/sprites/coin.json')
    .load(initGameObjects);


    //scrollTextPos = width * 1.5;

    //currentstate = states.Splash;
    
    

    //FeedbackChart.init();


    // initate graphics and buttons
//    var img = new Image();
//    img.onload = function () {
//
//        //Init the car and the rest of game sprites
//        bird.init(this);
//        initSprites(this);
//
//        backgroundFx.update();
//
//        okbtn = {
//            x: (width - s_buttons.Ok.width) / 2,
//            y: height - 200,
//            width: s_buttons.Ok.width,
//            height: s_buttons.Ok.height
//        }
//
//        sharebtn = {
//            x: (width - s_buttons.Share.width) / 2,
//            y: height - 150,
//            width: s_buttons.Share.width,
//            height: s_buttons.Share.height,
//        }
//
//        shuttlebtn = {
//            x: 193, //(width - s_buttons.Shuttle.width)/2,
//            y: 195, //height - 150,
//            width: s_buttons.Shuttle.width,
//            height: s_buttons.Shuttle.height,
//        }
//
//        detourbtn = {
//            x: 193, //(width - s_buttons.Detour.width)/2,
//            y: 375, //height - 150,
//            width: s_buttons.Detour.width,
//            height: s_buttons.Detour.height,
//        }
//
//       
//    }

    //var date = new Date;
   // var hour = date.getHours();
    //var month = date.getMonth();

}

function initGameObjects(loader,resource)
{
   
    car_texture = resource.car_blue.texture;
    game.objects["car"] = new Car(car_texture);
    
    game.objects["splash_txt"] = new PIXI.Text('click to begin', { font: 'bold italic 32px Arvo', fill: '#3e1707', align: 'center', stroke: '#a4410e', strokeThickness: 7 });

    game.objects["splash_txt"].position.x = game.pref_width/2;
    game.objects["splash_txt"].position.y = game.pref_width/2;
    game.objects["splash_txt"].anchor.x = 0.5;
    
    game.objects["speed_txt"] = new PIXI.Text('Speed:', { font: 'bold 14px Arial', fill: '#FFFFFF', align: 'center', stroke: '#000000', strokeThickness: 2 });
    game.objects["distance_txt"] = new PIXI.Text('Distance:', { font: 'bold 14px Arial', fill: '#FFFFFF', align: 'center', stroke: '#000000', strokeThickness: 2 });
    game.objects["coins_txt"] = new PIXI.Text('Coins:', { font: 'bold 14px Arial', fill: '#FFFFFF', align: 'center', stroke: '#000000', strokeThickness: 2 });
    
    main_road_t = resource.road_light_forest.texture;
    game.objects["road_main"] = new Road(main_road_t);
    game.objects["road_main"].r_limit = 384;
    game.objects["road_main"].l_limit = 128;
    
    junction_road_t = resource.junction_road.texture;
    game.objects["road_junction"] = new Road(junction_road_t);
    game.objects["road_junction"].r_limit = 384;
    game.objects["road_junction"].l_limit = 128;
    
    detour_road_t = resource.detour_road.texture;
    game.objects["road_detour"] = new Road(detour_road_t);
    game.objects["road_detour"].r_limit = 128;
    game.objects["road_detour"].l_limit = 384;
   
    //array of coins used by the game. Init as empty
    game.objects["coins"] = [];
    
    //Load coin textures
    var coin_textures = [];

    for (i = 0; i < 8; i++)
    {
        coin_textures.push(resource.coin.textures[i]);
    }
    
    //and create and pool of 20 coins to reuse
    
    for( i = 0; i < 20; i++)
    {
        var coin = new Coin(coin_textures);
        coin.play();
        coin.animationSpeed = .4;
        coin.setState(new CoinState_Inactive(game,coin));
        
        game.objects["coins"].push(coin);
    }
   
    
    run();
}

function debugLog(txt) {
    if (window.location.hash) {
        document.getElementById("consoleMe").innerHTML = txt;
    }
}

/**
 * Starts and update gameloop
 */
function run() {
    game.init();
    console.log("Starting the game loop");
    loop();
}

/*
 * 1/19/2015 Took out the loop animation out of the run method 
 */
function loop(timestamp)
{
    /*
    Calculate time passed since the last frame was rendered (d_t) in miliseconds
    */
    if( ! f_start_time ){
        f_start_time = timestamp;
    }   
    
    var d_t = timestamp - f_start_time;
    f_start_time = timestamp;
    
    //console.log("Frame duration" + d_t)
    
    if (!isGamePaused) {
        game.update(d_t);
    }
    
    game.render();
    
    requestAnimationFrame(loop);
}

/**
 * Update foreground, car and coins position
 */
function update() {
    frames++;
    
    if (trial_time > 700 && coin_count > -1) { //coin_count >3){// for bias version
        trial_time = 0;
        coin_count = 0;
        stage++;
        if (stage < 7) { // trial now proceeds to the juction stage
            currentstate = states.Junction;
            junction_before_choice = true;
            console.log("Time to get a new feedback data");
            //Calling json to get new data
            get_shuttle_stats();
        }
        else { // finished the session with 5 lakes and 6 areas
            report_score(score);
            reset_game_vars();
            stage = 1;
            hideGameCanvas();
        }
    }

    if (currentstate !== states.Score) {
        game.objects["road_main"].tilePosition.y += 1;
        
    } else {
        // set best score to maximum score
        best = Math.max(best, score);
        try {
            localStorage.setItem("best", best);
        } catch (err) {
            //needed for safari private browsing mode
        }
        scrollTextPos = width * 1.5;
    }

    if (currentstate === states.Game) {
        //coins.update();
    }
    
    //game.objects["car"].update();
    //bird.update();
    //backgroundFx.update();
}

/**
 * Draws car and all assets to the canvas
 */
function render() {
    // draw background color
    ctx.fillRect(0, 0, width, height);

    // draw background sprites
    switch (stage) {
        case 1:
            s_bg.draw(ctx, 0, height - s_bg2.height);
            break;
        case 2:
            s_bg2.draw(ctx, 0, height - s_bg2.height);
            break;
        case 3:
            s_bg3.draw(ctx, 0, height - s_bg2.height);
            break;
        case 4:
            s_bg4.draw(ctx, 0, height - s_bg2.height);
            break;
        case 5:
            s_bg5.draw(ctx, 0, height - s_bg2.height);
            break;
        case 6:
            s_bg6.draw(ctx, 0, height - s_bg2.height);
            break;
    }

    coins.draw(ctx);

    // draw foreground sprites
    s_bg_street.draw(ctx, fgpos, height - s_bg_street.height + 100);
    s_bg_street.draw(ctx, fgpos + s_bg_street.width - 20, height - s_bg_street.height + 100);

    var width2 = width / 2; // center of canvas

    if (currentstate === states.Splash) {
        // draw splash text and sprite to canvas

        s_splash.draw(ctx, width2 - s_splash.width / 2, height - 300);
        s_text.GetReady.draw(ctx, width2 - s_text.GetReady.width / 2, height - 380);

        if (scrollTextPos < (0 - s_text.FlappyBird.width - width)) {
            scrollTextPos = width * 1.5;
        }

        scrollTextPos = scrollTextPos - 3;
        s_text.FlappyBird.draw(ctx, scrollTextPos, s_bg_street.height + 300);
    }






    /* 
     // these are the state variables of the car around the lake: 
     junction_before_choice=false, // during this time the car will go to the junction
     junction_choice=false, // during this time the car waits at the junction
     junction_shuttle_positioning=false, // durign this time the car position itself on the dock after shuttle choice
     junction_wait_for_shuttle=false, // during this stage the care waits for the shuttle at the dock
     junction_taking_detour1=false, // the car takes the detour around the lake
     */


    if (currentstate === states.Game)
        trial_time++;

    if (currentstate === states.Junction) {

// first, take the car to the junction
        if (junction_before_choice) {
            if (bird_offset == 0)
                bird_offset = 100;  // this set the y offset of the car on the road
            if (bird_offset > 2)
                bird_offset -= 2; // lifting the car up, slowly toward the junction
            s_junction.drawX(ctx, 0, height - 500, x_offset, 0); // drawX = function(ctx, x, y, x_offset, y_offset)
            var w5 = width / 5;
            if (x_offset < w5)
                x_offset++;
            else { // we reached the junction!
                junction_before_choice = false;
                junction_choice = true;
                new_junction = true;
            }
        }

        if (junction_choice) { // the car is now at the junction, with car offset lifting it slightly until it reaches the right position waiting 

            /* // uncomment for bias version
             
             //if(score>3)score=score-4;
             // else  return; 
             Report_user_action(action_codes['shuttle_choice_ride'], stage - 1);
             set_shuttle_performance();
             shuttleChoice = true;
             detourChoice = false;
             junction_choice = false;
             junction_shuttle_positioning = true;
             
             }
             
             if(score>3){ // user has enough money to pay for the shuttle
             s_buttons.Shuttle.draw(ctx, shuttlebtn.x, shuttlebtn.y);
             draw_stars(shuttle_feedback[0],shuttle_feedback[1],shuttle_feedback[2]); //,0,0);//
             }
             */  // uncomment for bias version



            s_junction.drawX(ctx, 0, height - 500, x_offset, 0); // we now draw the buttons of the 'shuttle' and 'detour' when the car is waiting:
            s_buttons.Detour.draw(ctx, detourbtn.x, detourbtn.y);
            if (score > 3) { // user has enough money to pay for the shuttle
                s_buttons.Shuttle.draw(ctx, shuttlebtn.x, shuttlebtn.y);
                draw_stars(shuttle_feedback[0], shuttle_feedback[1], shuttle_feedback[2]); //,0,0);//
            }



            FeedbackChart.draw(ctx); // draw 'shuttle cost 4 coins

            if (new_junction) {
                //s_buttons.Shuttle.draw(ctx, shuttlebtn.x, shuttlebtn.y);
                new_junction = false;
                // here was the stars report

            }
            /*
             if(session===1)rnd=6;
             else rnd=Math.floor((Math.random() * 2) + 1);         
             switch(rnd)
             {
             case 1: s_buttons.Shuttle_1star.draw(ctx, shuttlebtn.x, shuttlebtn.y); break;
             case 2: s_buttons.Shuttle_2stars.draw(ctx, shuttlebtn.x, shuttlebtn.y); break;
             case 3: s_buttons.Shuttle_3stars.draw(ctx, shuttlebtn.x, shuttlebtn.y); break;
             case 4: s_buttons.Shuttle_4stars.draw(ctx, shuttlebtn.x, shuttlebtn.y); break;
             case 5: s_buttons.Shuttle_5stars.draw(ctx, shuttlebtn.x, shuttlebtn.y); break;
             case 6: s_buttons.Shuttle.draw(ctx, shuttlebtn.x, shuttlebtn.y); break;
             }
             */
        }



        if (shuttleChoice) {
            junction_choice = false;
            // we now deal with moving the car up, and the image right to place the care at the loading dock waiting spot
            if (junction_shuttle_positioning) {
                var w2 = width / 1.2;
                if (x_offset < w2) {
                    x_offset += 2;
                    bird.rotation = -0.4;
                    s_junction.drawX(ctx, 0, height - 500, x_offset, 0);
                    if (bird_offset > -190)
                        bird_offset -= 2;
                }
                else {
                    bird.rotation = 0;
                    junction_wait_for_shuttle = true;
                    junction_shuttle_positioning = false;
                }
            }


            if (junction_wait_for_shuttle) {
                shuttle_delay++;
                bird.rotation = 0;
                s_junction.drawX(ctx, 0, height - 500, x_offset, 0);
                // the shuttle has arrived  
                if (shuttle_delay > shuttle_wait) {
                    s_shuttle.draw(ctx, shuttle_retract + width2 * 1.8, height - 410);
                    /*
                     if (shuttle_speed === shuttle_speed_high)
                     s_shuttleX.draw(ctx, shuttle_retract + width2 * 1.8, height - 410);// shuttle_retract + 500+x_offset+width2 - s_splash.width/2+50, height - 410);
                     else if (shuttle_speed === shuttle_speed_low)
                     s_shuttleO.draw(ctx, shuttle_retract + width2 * 1.8, height - 410);
                     else
                     s_shuttle.draw(ctx, shuttle_retract + width2 * 1.8, height - 410);
                     */
                    // reverse shuttle toward the car:  
                    if (shuttle_retract > -width / 1.4)
                        shuttle_retract -= shuttle_speed;
                    // cross the lake!
                    else if (shuttle_forward < width * 1.3) {
                        shuttle_forward += shuttle_speed;
                        x_offset += shuttle_speed;
                    }
                    else {
                        detourChoice = false;
                        shuttleChoice = false;
                        shuttle_forward = 0;
                        shuttle_retract = 0;
                        shuttle_delay = 0;
                        delays = false;
                        x_offset = 0;
                        second_x_offset = 0;
                        y_offset = 0;
                        bird.rotation = 0;
                        second_y_offset = 0;
                        bird_offset = 0;
                        junction_wait_for_shuttle = false;
                        currentstate = states.Game;
                        if (popup === 1) {
                            showDialog();
                            //Report_user_action(99000+(10*performance_mem), 99000+client_score_mem- (session * 10));
                        }
                        else if (popup === 3 && first_pop) {
                            first_pop = false;
                            showDialog();
                        }
                        else if (popup === 2) {
                            every_other_pop++;
                            if (every_other_pop % 2)
                                showDialog();
                        }
                    }
                }
                else {
                    if (delays)
                        s_text_delays.draw(ctx, okbtn.x + 10, okbtn.y - 170);
                    else
                        s_buttons.Share.draw(ctx, okbtn.x + 10, okbtn.y - 170); // Share is wait...
                }
            }
        } // end shuttle choice



        if (detourChoice) {
            // first drive down     
            if (junction_taking_detour1) {
                bird.rotation = 0.5;
                s_junction.drawX(ctx, 0, 0, second_x_offset * 1.22, second_x_offset * 1.7);
                if (second_x_offset < 530)
                    second_x_offset += 1.6;// 3;
                else {
                    junction_taking_detour1 = false;
                    junction_taking_detour2 = true;
                }
            }

            // second part, flat
            if (junction_taking_detour2) {
                bird.rotation = 0;
                s_junction.drawX(ctx, 0, 0, second_x_offset * 1.22, 900);
                if (second_x_offset < 800)
                    second_x_offset += 1.5;
                else {
                    y_offset = 0;
                    junction_taking_detour2 = false;
                    junction_taking_detour3 = true;
                }
            }

            // last drive up 
            if (junction_taking_detour3) {
                bird.rotation = -0.9;
                s_junction.drawX(ctx, 0, 0, second_x_offset * 1.22, 900 - y_offset);
                if (y_offset < 816)
                    y_offset += 3;//1.6;
                else { // reset vars
                    junction_taking_detour3 = false;
                    detourChoice = false;
                    shuttleChoice = false;
                    x_offset = 0;
                    second_x_offset = 0;
                    y_offset = 0;
                    bird.rotation = 0;
                    second_y_offset = 0;
                    bird_offset = 0;
                    i = 0;
                    currentstate = states.Game;
                }   // end reset vars
            }  // end last drive up
        } // end detour choice	
    } // end currentstate === states.Junction


    if (currentstate === states.Score) {
        // draw gameover text and score board
        s_text.GameOver.draw(ctx, width2 - s_text.GameOver.width / 2, height - 400);
        s_score.draw(ctx, width2 - s_score.width / 2, height - 340);
        s_buttons.Ok.draw(ctx, okbtn.x, okbtn.y);
        s_buttons.Share.draw(ctx, sharebtn.x, sharebtn.y);

        // draw score and best inside the score board
        s_numberS.draw(ctx, width2 - 47, height - 304, score, null, 10);
        s_numberS.draw(ctx, width2 - 47, height - 262, best, null, 10);

    } else {
        // draw score to top of canvas
        //if (currentstate != states.Junction)
        s_numberB.draw(ctx, null, 20, score, width2);
    }
    bird.draw(ctx);
}






function Report_user_action(user_choice, game_state) // choice will return 1 for shuttle and 2 for detour
{
    var state2 = (session * 10) + game_state;
    var client = new XMLHttpRequest();
    var postdata = "action=" + encodeURIComponent(unescape(user_choice)) + "&state=" + encodeURIComponent(unescape(state2));
    client.open("POST", "./u311/carexperiment/ctrl/saveClickData.php");
    client.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
    client.send(postdata);
}


function report_score(score)
{
    var client = new XMLHttpRequest();
    var postdata = "score=" + encodeURIComponent(unescape(score));
    client.open("POST", "./u311/carexperiment/ctrl/registerScore.php");
    client.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
    client.send(postdata);

}



function set_shuttle_performance() // choice will return 1 for shuttle and 2 for detour
{
    get_performance();
    /*
     
     if(session===1)
     {
     if(ind===1) {shuttle_wait=shuttle_wait_med; shuttle_speed=shuttle_speed_med; popup=0; }
     else if(ind===2) {shuttle_wait=shuttle_wait_short; shuttle_speed=shuttle_speed_high; popup=1; performance_mem=0;}
     else if(ind===3) {shuttle_wait=shuttle_wait_long; shuttle_speed=shuttle_speed_high; popup=0;}
     else if(ind===4) {shuttle_wait=shuttle_wait_med; shuttle_speed=shuttle_speed_low; popup=1; performance_mem=20;}
     else  {shuttle_wait=shuttle_wait_short; shuttle_speed=shuttle_speed_low;popup=0; } 
     if(overide)popup=0;
     }
     else get_performance();
     
     ind++;
     
     // this is for the one shot control experiments: no choices, no popups  
     if(ind===1)       {shuttle_wait=250; shuttle_speed=2.5; popup=0; }
     else if(ind===2) {shuttle_wait=250; shuttle_speed=2.5; popup=0; }
     else if(ind===3) {shuttle_wait=250; shuttle_speed=2.5; popup=0; }
     else if(ind===4) {shuttle_wait=250; shuttle_speed=2.5; popup=0; }
     else             {shuttle_wait=250; shuttle_speed=2.5; popup=0; }
     */
}



// start and run the game
window.onload = function () {
    main();
};



function resizeWindow(){
    
    win_width = window.innerWidth;
    win_height = window.innerHeight;
    
    ratio  = 1;
    
    if( win_width < game.pref_width || win_height < game.pref_height){
        ratio = Math.min(window.innerWidth/game.pref_width ,window.innerHeight/game.pref_height);
    }
    game.pixi_stage.scale.x = game.pixi_stage.scale.y = ratio;
    
    game.pixi_renderer.resize(Math.ceil(game.pref_width*ratio),Math.ceil(game.pref_height*ratio));
    
}

function hideGameCanvas()
{
    window.location.href = ServerStateVars.survey_url;
}


function showGameCanvas()
{
    isGamePaused = false;
    var canvas = document.getElementById("gamecanvas");
    var form = document.getElementById("survey_form");
    form.style.display = 'none';
    canvas.style.display = 'block';

    return false;
}


function get_shuttle_stats()
{
    var client = new XMLHttpRequest();
    client.open("GET", "./u311/carexperiment/ctrl/getShuttleStats.php"); //Math.random is used to make the URL unique to prevent caching
    client.send();
    client.onreadystatechange = function () {
        if (client.readyState == 4 && client.status == 200) {
            stats = client.responseText; // need to parse...
            var json_obj = JSON.parse(stats);

            var avg_array = json_obj.data.scores_avg;
            /*
             * Paring JSON object
             * Make sure to handle errors!!!
             */

            max = 6
            min = 0;

            shuttle_feedback[0] = avg_array[0];//Math.floor(Math.random() * (max - min)) + min;
            shuttle_feedback[1] = avg_array[1];//Math.floor(Math.random() * (max - min)) + min;
            shuttle_feedback[2] = avg_array[2];//Math.floor(Math.random() * (max - min)) + min;
            var scr = Math.round(shuttle_feedback[0]) + Math.round(shuttle_feedback[1]) * 10 + Math.round(shuttle_feedback[2]) * 100;
            scr = scr + 7000;//+shuttle_feedback[0]+(shuttle_feedback[1]*10)+(shuttle_feedback[2]*100);
            Report_user_action(scr, stage - 1);

        }
    }

}



function get_performance() // choice will return 1 for shuttle and 2 for detour
{
    var performance_duration;
    feedbacks_num = 0;
    var client = new XMLHttpRequest();
    client.open("GET", "./u311/carexperiment/ctrl/getPerformance.php"); //Math.random is used to make the URL unique to prevent caching
    client.send();
    client.onreadystatechange = function () {
        if (client.readyState === 4 && client.status === 200) {
            feedbacks = client.responseText; // need to parse...
            var obj = JSON.parse(feedbacks);
            feedbacks_num = Number(obj.data.performance);
            feedbacks_corr = Number(obj.data.correlation);

            // this is for the case where we converted corr into usage
            var shuttle_usage = feedbacks_corr;
            performance_duration = ((-12.5 * feedbacks_num) + (-12.5 * shuttle_usage) + 22) / 2; // good performance

            // this is for the experiments where performance is only affecte by % feedback from shuttle riders (excluding detours)
            // performance_duration = ((-30) * feedbacks_num + 30) / 2; 

            // this is for good, feedback driven performance experiments
            //performance_duration = ((-25) * feedbacks_num + 22) / 2; // good performance

            // this is for poor, feedback driven performance experiments: 
            //performance_duration = ((-28) * feedbacks_num + 29) / 2; // bad performance
            /*             
             // this is for the correlation dependent experiments:
             if(feedbacks_corr!==-99) {
             performance_duration+=feedbacks_corr*10; // note that correlation between duration and score should be negative, reducing duration
             performance_duration+=3; // a panalty so that only correlation above 0.3 will help.
             Report_user_action(8500+(100*feedbacks_corr), stage - 1);
             }
             */
            if (performance_duration < 0) {
                performance_duration = 0;
            }
            Report_user_action(8000 + performance_duration, stage - 1);
            performance_mem = performance_duration;
            shuttle_wait = performance_duration * 60;
            shuttle_speed = -0.112 * performance_duration + 2.455;
            if (shuttle_speed < 0.2)
                shuttle_speed = 0.2; // prevent shuttle from stalling

        }
    }
}


function draw_stars(x, y, z)
{
    if (show_feedback === false)
        return;
    offset = 52;//32;//52;
    if (x) {
        for (i = 0; i < 5; i++) {
            if (i < x)
                s_star.draw(ctx, shuttlebtn.x + offset + 14 * i, shuttlebtn.y + 40);//60);//40);
            else
                s_gray_star.draw(ctx, shuttlebtn.x + offset + 14 * i, shuttlebtn.y + 40);//60);//+40);
        }
    }

    if (y) {
        for (i = 0; i < 5; i++) {
            if (i < y)
                s_star.draw(ctx, shuttlebtn.x + offset + 14 * i, shuttlebtn.y + 54);
            else
                s_gray_star.draw(ctx, shuttlebtn.x + offset + 14 * i, shuttlebtn.y + 54);
        }
    }

    if (z) {
        for (i = 0; i < 5; i++) {
            if (i < z)
                s_star.draw(ctx, shuttlebtn.x + offset + 14 * i, shuttlebtn.y + 68);
            else
                s_gray_star.draw(ctx, shuttlebtn.x + offset + 14 * i, shuttlebtn.y + 68);
        }
    }

}

function btnClickHandler()
{
    var client = new XMLHttpRequest();
    var postdata = "action=1&state=1";


    client.open("POST", "./u311/carexperiment/ctrl/saveClickData.php");
    client.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');

    client.onreadystatechange = function () {
        if (client.readyState == client.DONE && client.status == 200) {
            alert(client.responseText);
        }
    };

    client.send(postdata);

}

function showDialog()
{

    var w = window.innerWidth;
    var h = window.innerHeight;


    var dialog = document.getElementById("rating_dialog");
    dialog.style.display = "block";
    dialog.style.position = "absolute";
    dialog.style.left = ((w - dialog.offsetWidth) / 2) + "px";
    dialog.style.top = ((h - dialog.offsetHeight) / 2) + "px";

    var checkbox = document.getElementById("rating_c_box");
    checkbox.checked = false;

    isGamePaused = true;

}

function hideRatingDialog()
{
    var dialog = document.getElementById("rating_dialog");
    dialog.style.display = "none";
    isGamePaused = false;
}


function saveRatingDialog(client_score)
{

    //client_score_mem=client_score;

    //alert('popup'+popup);
    if (client_score === -999) // user decided to bail out...
    {
        overide = true;
        var yyy = false;
        var client = new XMLHttpRequest();
        var postdata = "popup=" + encodeURIComponent(unescape(yyy));
        client.open("POST", "./u311/carexperiment/ctrl/setShowPopup.php");
        client.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
        client.send(postdata);
        popup = false;
        var dialog = document.getElementById("rating_dialog");
        dialog.style.display = "none";
        isGamePaused = false;
        dialog1_done = dialog2_done = false;
    }
    else {
        score1 = client_score;
        dialog1_done = true;
    }

    if (dialog1_done && dialog2_done)
    {
        var state2 = (session * 10);
        var client = new XMLHttpRequest();
        var postdata = "action=" + encodeURIComponent(unescape((score1 + score2) / 2.0)) + "&state=" + encodeURIComponent(unescape(state2));
        client.open("POST", "./u311/carexperiment/ctrl/saveClickData.php");
        client.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
        client.send(postdata);

        Report_user_action(99000 + (10 * performance_mem), 99000 + (score1 + score2) / 2.0 - (session * 10));
        Report_user_action(5000, 5000 + score1 - session * 10);
        Report_user_action(5100, 5100 + score2 - session * 10);
        var boxes = document.getElementsByClassName("score_cbox");
        for (var i = 0; i < boxes.length; i++)
        {
            boxes[i].checked = false;
        }

        boxes = document.getElementsByClassName("score_cbox2");
        for (var i = 0; i < boxes.length; i++)
        {
            boxes[i].checked = false;
        }

        var dialog = document.getElementById("rating_dialog");
        dialog.style.display = "none";
        isGamePaused = false;
        dialog1_done = dialog2_done = false;
    }

}


function saveRatingDialog2(client_score)
{


    score2 = client_score;
    dialog2_done = true;

    if (dialog1_done && dialog2_done)
    {
        var state2 = (session * 10);
        var client = new XMLHttpRequest();
        var postdata = "action=" + encodeURIComponent(unescape((score1 + score2) / 2.0)) + "&state=" + encodeURIComponent(unescape(state2));
        client.open("POST", "./u311/carexperiment/ctrl/saveClickData.php");
        client.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
        client.send(postdata);

        Report_user_action(99000 + (10 * performance_mem), 99000 + (score1 + score2) / 2.0 - (session * 10));
        Report_user_action(5000, 5000 + score1 - session * 10);
        Report_user_action(5100, 5100 + score2 - session * 10);
        var boxes = document.getElementsByClassName("score_cbox");
        for (var i = 0; i < boxes.length; i++)
        {
            boxes[i].checked = false;
        }

        boxes = document.getElementsByClassName("score_cbox2");
        for (var i = 0; i < boxes.length; i++)
        {
            boxes[i].checked = false;
        }

        var dialog = document.getElementById("rating_dialog");
        dialog.style.display = "none";
        isGamePaused = false;
        dialog1_done = dialog2_done = false;
    }

}