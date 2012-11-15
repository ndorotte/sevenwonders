var SevenWonders = function(socket, args){
	this.wonder = args.wonder;
	this.players = args.plinfo;
	this.coins = parseInt(args.coins);
	this.socket = socket;
	this.cardsPlayed = [];
	this.leftPlayed = {};
	this.rightPlayed = {};
	this.trashing = false;
	this.neighbors = args.neighbors;
	this.colorOrder = ['brown', 'grey', 'yellow', 'red', 'green', 'purple', 'blue'];

	// select wonder image here (load in appropriately)
	// TODO: let player choose wonder side
	$('#wonder').css('background', 'url(images/' + this.wonder.toLowerCase() + 'A.png) no-repeat center center');

	// Add coins
	var rot = (Math.random() - 0.5) * 300;
	var img = $('<img src="images/coin3.png" />');
	img.css({'-webkit-transform': 'rotate(' + rot + 'deg)', '-moz-transform': 'rotate(' + rot + 'deg)'});
	$('#coins').append(img);
}

SevenWonders.prototype = {
	send: function(opts, type){
		opts = (typeof opts == "object" && !(opts instanceof Array)) ? opts : {value: opts};
		opts.messageType = type;
		this.socket.send(JSON.stringify(opts));
	},

	cardImageFromName: function(name){
		return '<img src="images/' + name.toLowerCase().replace(/ /g, "") + '.png" />';
	},

	onMessage: function(args, msg){
		switch(args.messageType){
			case 'hand':
				args.cards = $.map(args.cards, function(k,v){ return [k]; });

				$('#age').html(args.age);
				$('.card').addClass('ignore');
				$('.card:not(.highlighted, .played)').fadeOut(500, function(){
					$(this).remove();
				});

				var self = this;
				var cardWidth = 123;
				var cardHeight = 190;
				function moveToBoard(card){
					if(self.trashing){
						this.trashing = false;
						card.animate({
							left: Math.random() * 2000 * (Math.random() > 0.5 ? -1 : 1),
							bottom: Math.random() * 2000 * (Math.random() > 0.5 ? -1 : 1),
							opacity: 0,
						}, 500, function(){ $(this).remove(); });
					} else {
						var infoPos = $('#wonder').position();
						var cardColor = card.data('cardInfo').color;
						var index = self.colorOrder.indexOf(cardColor);
						var numInColor = 0;
						for(i in self.cardsPlayed)
							if(self.cardsPlayed[i].data('cardInfo').color == cardColor) numInColor++;

						card.find('.options, h1').css('display', 'none');
						card.animate({
							left: infoPos.left - 400 + index * 135,
							bottom: $('#game').height() - infoPos.top - 155 + numInColor * 40 - (cardColor == 'blue' ? 100 : 0),
							width: cardWidth,
							height: cardHeight
						})

						self.cardsPlayed.push(card);
						card.removeClass('highlighted').removeClass('selected');
					}
				}

				// move selected card to board for later reference
				var selected = $('.card.highlighted');
				if(selected.length){
					selected.addClass('played').attr('id', '');
					selected.rotate({animateTo: 0});
					moveToBoard(selected);
				}

				// animate selected to board

				var count = args.cards.length;
				for(i in args.cards){
					var card = args.cards[i];						
					var div = $('<div class="card" id="card' + count + '" style="background: #' + this.colorOrder[card.color] + ';">\
						<h1>' + card.name + '</h1>\
						' + this.cardImageFromName(args.cards[i].name) + '\
						<div class="options">\
							<a href="#" class="trash">Trash</a>\
							<a href="#" class="play">Play</a>\
							<a href="#" class="wonder">Wonder</a>\
							<a href="#" class="undo">Undo</a>\
						</div>\
					</div>');
					$('#game').prepend(div);
					div.data('cardInfo', card);
					count--;
				}

				function cardIndex(card){
					return parseInt($(card).attr('id').substring(4,5)) - 1;
				}

				/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
				* This is where we start handling animations for cards.  *
				* It gets pretty messy. There's a lot of interface stuff *
				* going on to check edge cases and what not. 			 *
				*             I am not proud of this code.				 *
				* * * * * * * * * * * * * * * * * * * * * * * * * * * * */

				// Put new cards at start position and rotate them accordingly
				var numCards = args.cards.length;
				$('.card').each(function(){
					if($(this).hasClass('ignore')) return;
					var deg = (cardIndex(this) + 0.5 - numCards / 2) * 8;
					$(this).css({
						'-webkit-transform': 'rotate(' + deg + 'deg)',
						'-moz-transform': 'rotate(' + deg + 'deg)',
						'left': $('#wonder').position().left - 75,
						'bottom': -200
					});
					$(this).data('rotation', deg);
				})

				// card dealing animation
				setTimeout(function(){
					$('.card:not(.ignore)').each(function(){
						var index = cardIndex(this);
						$(this).animate({
							'bottom': '+=' + ((Math.pow(index + 0.5 - numCards / 2, 2) * -8) + 665),
							'left': '+=' + (index + 0.5 - numCards / 2) * 100
						}, 2000, 'easeOutExpo');

					});
				}, 1000);

				// card blow up animation (on click)
				$('.card').click(function(e){ 
					e.stopPropagation();
					if($(this).is(':animated') || $(this).hasClass('ignore')) return;
					if($(this).hasClass('selected')){
						$(this).css('z-index', 1);
						$(this).animate({ width: cardWidth, height: cardHeight, left: '+=25px', bottom: '+=38px' }, 200);
						$(this).removeClass('selected');
						$('.card:not(.ignore)').animate({ opacity: 1 }, 200);
						$('.options').css('display', 'none');
					} else {
						$('.card.selected').css('z-index', 1);
						var self = this;
						$('.card.selected').animate({width: cardWidth, height: cardHeight, left: '+=25px', bottom: '+=38px'}, 200);
						$('.card:not(.ignore)').removeClass('selected');
						$(self).addClass('selected');
						$('.card:not(.ignore, #' + $(this).attr('id') + ')').animate({ opacity: 0.1 }, 200);
						$('.options').css('display', 'none');
						$(self).animate({
							width: cardWidth + 50,
							height: cardHeight + 76.5,
							left: '-=25px',
							bottom: '-=38px',
							opacity: 1
						}, 200, function(){
							$(this).find('.options').fadeIn(200);
							$(this).css('z-index', 2);
						});
					}
				});

				function chooseCard(card, playtype){
					$('.card:not(.ignore)').removeClass('highlighted');
					card.addClass('highlighted');
					self.send([card.find('h1').html(), playtype], 'cardplay');
				}

				$('.trash').click(function(e){
					e.stopPropagation()
					var card = $(this).parent().parent();
					chooseCard(card, 'trash');
					self.trashing = true;
				})

				$('.play').click(function(e){
					e.stopPropagation()
					var card = $(this).parent().parent();
					chooseCard(card, 'play');	
					self.trashing = false;
				})

				$('.undo').click(function(e){
					e.stopPropagation();
					var card = $(this).parent().parent();
					card.removeClass('highlighted');
					self.send('', 'cardignore');
					self.trashing = false;
					card.find('.undo').animate({ opacity: 0 }, 200, function(){ 
						$(this).css('display', 'none'); 
						card.find('.options a:not(.undo)').css('display', 'block').animate({ opacity: 1 }, 200);
					});
				})

			break;

			case 'canplay':
				var card = $('.highlighted');
				card.find('.options a').animate({ opacity: 0 }, 200, function(){
					if(!card.find('.undo').is(':visible')){
						card.find('.undo').css('display', 'block').animate({opacity: 1}, 200);
					}
				});
			break;

			case 'cardschosen':
				var self = this;
				var updateColumn = function(side, color, img){
					var cardsPlayed = side == 'left' ? self.leftPlayed : self.rightPlayed;
					if(cardsPlayed[color] == undefined) cardsPlayed[color] = [];
					var length = cardsPlayed[color].length;
					img.appendTo('.neighbor.' + side);
					var bottom = 0;
					var lastIndex = 0;
					for(var i = self.colorOrder.indexOf(color); i >= 0; i--){
						var col = self.colorOrder[i];
						lastIndex = i;
						if(cardsPlayed[col] && cardsPlayed[col].length > 0){
							var topCard = cardsPlayed[col][cardsPlayed[col].length - 1];
							bottom = img.get(0) == topCard ? 0 : parseInt($(topCard).css('bottom')) + 40;
							break;
						}
					}
					for(var j = lastIndex + 1; j < self.colorOrder.length; j++){
						for(cIndex in cardsPlayed[self.colorOrder[j]]){
							var card_move = $(cardsPlayed[self.colorOrder[j]][cIndex]);
							card_move.animate({bottom: '+=40px'}, 200);
						}
					}
					img.css('bottom', bottom);
					img.css('z-index', 1000 * (8 - self.colorOrder.indexOf(color)) - length);
					cardsPlayed[color].push(img.get(0));
					img.animate({opacity: 1}, 200);
				}


				for(c in args.cards){
					if(args.cards[c].trashing) continue;
					var color = args.cards[c].color;
					var pl;
					for(i in this.players) 
						if(this.players[i].id == args.cards[c].id) pl = this.players[i];
					var img = this.cardImageFromName(args.cards[c].name);
					img = $('<div class="card ignore played">' + img + '</div>');
					if(pl.id == this.neighbors.left){
						updateColumn('left', color, img)
					} else if(pl.id == this.neighbors.right){
						updateColumn('right', color, img);
					}
				}
			break;

			case 'coins':
				var coins = args.data;
				var golds = Math.floor(coins / 3);
				var silvers = coins % 3;
				$('#coins').html('');
				for(var i = 0; i < silvers; i++){
					var rot = (Math.random() - 0.5) * 300;
					var img = $('<img src="images/coin1.png" class="silver" />');
					img.css({'-webkit-transform': 'rotate(' + rot + 'deg)', '-moz-transform': 'rotate(' + rot + 'deg)'});
					$('#coins').append(img);
				}
				$('#coins').append('<br />');

				for(var i = 0; i < golds; i++){
					var rot = (Math.random() - 0.5) * 300;
					var img = $('<img src="images/coin3.png" class="gold" />');
					img.css({'-webkit-transform': 'rotate(' + rot + 'deg)', '-moz-transform': 'rotate(' + rot + 'deg)'});
					$('#coins').append(img);
				}
				break;

			case 'resources':
				var resources = args.resources;
				// do things here?
			break;

			case 'error':
				// todo: more fancy alerts
				if($('.card.selected').length){
					var card = $('.card.selected');
					card.append('<div class="overlay"><h2>Error</h2>' + args.data + '</div>');
					card.find('.overlay').animate({ opacity: '0.9' }, 200);
					card.find('img').animate({opacity: '0.3'}, 200);;
					var removeErr = function(card){
						card.find('.overlay').animate({ opacity: 0 }, 200, function(){
							$(this).remove();
						});
						card.find('img').css('opacity', '1');
					}
					card.find('.overlay').click(function(e){ e.stopPropagation(); removeErr(card); })
					setTimeout(function(){ removeErr(card) }, 2000);
				}	else {
					alert(args.data)
				}
			break;

			default:
				console.log(args, msg);
			break;
		}
	}
}