var api_key = 'key-24125cce318ec427e9e994cb37d3087b';
var domain = 'sandboxe2ef77d2dea04510b84b5c1423ab1087.mailgun.org';
var mailgun = require('mailgun-js')({apiKey: api_key, domain: domain});

var data = {
  from: 'Excited User <kenneth@kennethphang.asia>',
  to: 'bunnyppl@gmail.com',
  subject: 'Hello',
  text: 'Testing some Mailgun awesomeness!'
};

mailgun.messages().send(data, function (error, body) {
  console.log(body);
});