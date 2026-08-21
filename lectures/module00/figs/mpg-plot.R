library(magrittr)
library(ggplot2)

dat = mpg

dat %>% 
  ggplot2::ggplot(., aes(x = displ, y = hwy)) + 
  ggplot2::geom_point(aes(color = class))
