CoinState_Inactive = function(world,coin)
{
    this.world = world;
    this.coin = coin;
}

CoinState_Inactive.prototype.update = function (d_t)
{
    
}

CoinState_Inactive.prototype.enter = function()
{
    console.log("Disabling coin");
    this.coin.visible = false;
};

CoinState_Inactive.prototype.exit = function()
{
    
};

CoinState_Inactive.prototype.handleInput = function ()
{
    
};

CoinState_Active = function(world,coin)
{
    this.world = world;
    this.coin = coin;
}

CoinState_Active.prototype.update = function (d_t)
{
    this.coin.y += this.world.objects["car"].v * d_t/1000 * this.world.objects["road_main"].m_to_pix;
    
    var road_h = this.world.objects["road_main"].height;
    
    if( this.coin.y > road_h)
    {
        this.coin.setState(new CoinState_Inactive(this.world,this.coin));
    }
}

CoinState_Active.prototype.enter = function()
{
    this.coin.visible = true;
    var road_r = this.world.objects["road_main"].r_limit;
    var road_l = this.world.objects["road_main"].l_limit;
    
    var road_w = road_r - road_l;
    var x_pos = road_l + Math.random() * road_w;
    
    this.coin.x = x_pos;
    this.coin.y = -10;
};

CoinState_Active.prototype.exit = function()
{
    
};

CoinState_Active.prototype.handleInput = function ()
{
    
};


Coin = function (textures) {

    //Call the "superclass/ll" 
    PIXI.extras.MovieClip.call(this,textures);
    this.state = null;
};

Coin.prototype = Object.create(PIXI.extras.MovieClip.prototype);
Coin.prototype.constructor = Coin;

Coin.prototype.updateObj = function(d_t){
    
    this.state.handleInput();
    this.state.update(d_t);
    
};

Coin.prototype.setState = function(state)
{
    console.log("\tCoin changing  state");
    
    if( this.state !== undefined && this.state !== null)
    {
        this.state.exit();
    }
    
    this.state = state;
    this.state.enter();
    
};




